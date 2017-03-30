var mqtt = require('mqtt');
var moment = require('moment');
var os = require('os');

var mqttParams = {
  //port: process.env.WATCHMEN_MQTT_BROKER_PORT,
  broker: process.env.WATCHMEN_MQTT_BROKER,
  topic: process.env.WATCHMEN_MQTT_TOPIC,
  username: process.env.WATCHMEN_MQTT_USERNAME,
  password: process.env.WATCHMEN_MQTT_PASSWORD,
  port: process.env.WATCHMEN_MQTT_PORT
};

function mqttPublish(message, payload) {
  // payload contains: event (name), service (name) and data
  // Get IP address - http://stackoverflow.com/questions/3653065/get-local-ip-address-in-node-js
  //console.log('mqttParams: ' + JSON.stringify(mqttParams));
  var broker = 'mqtt://' + mqttParams.broker;
  var topic = mqttParams.topic ? mqttParams.topic : 'watchmen';
  var topicStatus = null;
  if (payload.service) {
    topic += '/' + payload.service;
    topicStatus = topic + '/status';
    if (payload.event) {
      topic += '/' + payload.event;
    }
  }
  var options = {}
  if (mqttParams.username) {
    options.username = mqttParams.username
  }
  if (mqttParams.password) {
    options.password = mqttParams.password
  }
  if (mqttParams.port) {
    options.port = mqttParams.port
  }
  //console.log('mqttPublish, broker: ' + broker + ', options: ' + JSON.stringify(options));
  var client = mqtt.connect(broker, options);
  client.on('connect', function () {
    console.log('Calling publish, topic: ' + topic + ', payload: ' + payload.data);
    client.publish(topic, payload.data);
    switch (payload.event) {
      case 'serviceBack':
      case 'serviceOk':
        client.publish(topicStatus, '1');
        break;
      case 'newOutage':
      case 'currentOutage':
        client.publish(topicStatus, '0');
        break;
    }
  });
}

function publishIPAddrs() {
  console.log('publishIPAddrs');
  var ifaces = os.networkInterfaces();

  Object.keys(ifaces).forEach(function (ifname) {
    var alias = 0;

    ifaces[ifname].forEach(function (iface) {
      if ('IPv4' !== iface.family || iface.internal !== false) {
        // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
        return;
      }

      if (alias >= 1) {
        // this single interface has multiple ipv4 addresses
        var errorMsg = ifname + ':' + alias + ' ' + iface.address;
        console.log(errorMsg);
        mqttPublish(errorMsg, {event: ifname, service: 'ipAddr', data: iface.address});
      } else {
        // this interface has only one ipv4 adress
        var errorMsg = ifname + ' ' + iface.address;
        console.log(errorMsg);
        mqttPublish(errorMsg, {event: ifname, service: 'ipAddr', data: iface.address});
      }
      ++alias;
    });
  });
}

var eventHandlers = {

  /**
   * On a new outage
   * @param {Object} service
   * @param {Object} outage
   * @param {Object} outage.error check error
   * @param {number} outage.timestamp outage timestamp
   */

  onNewOutage: function (service, outage) {
    var errorMsg = service.name + ' down!'.red + '. Error: ' + JSON.stringify(outage.error).red;
    mqttPublish(errorMsg, {event: 'newOutage', service: service.name, data: outage.error});
  },

  /**
   * Failed ping on an existing outage
   * @param {Object} service
   * @param {Object} outage
   * @param {Object} outage.error check error
   * @param {number} outage.timestamp outage timestamp
   */

  onCurrentOutage: function (service, outage) {
    var errorMsg = service.name + ' is still down!'.red + '. Error: ' + JSON.stringify(outage.error).red;
    mqttPublish(errorMsg, {event: 'currentOutageMsg', service: service.name, data: outage.error});
    var outageLength = moment(outage.timestamp).from(moment());
    console.log('outageLength: ' + outageLength + ', typeof: ' + typeof(outageLength));
    mqttPublish(errorMsg, {event: 'currentOutageLength', service: service.name, data: outageLength});
  },

  /**
   * Failed check (it will be an outage or not according to service.failuresToBeOutage
   * @param {Object} service
   * @param {Object} data
   * @param {Object} data.error check error
   * @param {number} data.currentFailureCount number of consecutive check failures
   */

  onFailedCheck: function (service, data) {
    var errorMsg = service.name + ' check failed!'.red + '. Error: ' + JSON.stringify(data.error).red;
    mqttPublish(errorMsg, {event: 'failedCheck', service: service.name, data: data.currentFailureCount.toString()});
  },

  /**
   * Warning alert
   * @param {Object} service
   * @param {Object} data
   * @param {number} data.elapsedTime (ms)
   */

  onLatencyWarning: function (service, data) {
    var msg = service.name + ' latency warning'.yellow + '. Took: ' + (data.elapsedTime + ' ms.').yellow;
    mqttPublish(msg, {event: 'latencyWarning', service: service.name, data: data.elapsedTime.toString()});
  },

  /**
   * Service is back online
   * @param {Object} service
   * @param {Object} lastOutage
   * @param {Object} lastOutage.error
   * @param {number} lastOutage.timestamp (ms)
   */

  onServiceBack: function (service, lastOutage) {
    var duration = moment.duration(+new Date() - lastOutage.timestamp, 'seconds');
    var errorMsg = service.name.white + ' is back'.green + '. Down for '.gray + duration.humanize().white;
    mqttPublish(errorMsg, {event: 'serviceBack', service: service.name, data: duration.humanize()});
  },

  /**
   * Service is responding correctly
   * @param {Object} service
   * @param {Object} data
   * @param {number} data.elapsedTime (ms)
   */

  onServiceOk: function (service, data) {
    var serviceOkMsg = service.name + ' responded ' + 'OK!'.green;
    var responseTimeMsg = data.elapsedTime + ' ms.';
    mqttPublish(serviceOkMsg + ', ' + responseTimeMsg, {
      event: 'serviceOk',
      service: service.name,
      data: data.elapsedTime.toString()
    });
  }
};

function MqttPlugin(watchmen) {
  console.log('Starting MQTT Plugin...');
  publishIPAddrs();
  watchmen.on('new-outage', eventHandlers.onNewOutage);
  watchmen.on('current-outage', eventHandlers.onCurrentOutage);
  watchmen.on('service-error', eventHandlers.onFailedCheck);

  watchmen.on('latency-warning', eventHandlers.onLatencyWarning);
  watchmen.on('service-back', eventHandlers.onServiceBack);
  watchmen.on('service-ok', eventHandlers.onServiceOk);
}

exports = module.exports = MqttPlugin;
