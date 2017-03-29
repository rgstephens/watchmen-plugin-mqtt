var mqtt = require('mqtt');
var moment = require('moment');

var mqttParams = {
  //port: process.env.WATCHMEN_MQTT_BROKER_PORT,
  broker: process.env.WATCHMEN_MQTT_BROKER,
  topic: process.env.WATCHMEN_MQTT_TOPIC,
  username: process.env.WATCHMEN_MQTT_USERNAME,
  password: process.env.WATCHMEN_MQTT_PASSWORD,
  port: process.env.WATCHMEN_MQTT_PORT
};

function mqttPublish(message, payload) {
  // Get IP address - http://stackoverflow.com/questions/3653065/get-local-ip-address-in-node-js
  var broker = mqttParams.broker ? mqttParams.broker : 'http://stephens.click';
  var topic = mqttParams.topic ? mqttParams.topic : 'watchmen';
  var topicMsg = mqttParams.topic ? mqttParams.topic : 'watchmen/msg';
  if (payload.service) {
    topic += '/' + payload.service;
    topicStatus += '/' + payload.service + '/status';
    topicMsg += '/' + payload.service;
    if (payload.event) {
      topic += '/' + payload.event;
      topicMsg += '/' + payload.event;
    }
  }
  var options = {
    username: mqttParams.username ? mqttParams.username : 'greg',
    password: mqttParams.password ? mqttParams.password : '121'
  };
  console.log('mqttPublish, broker: ' + broker + ', typeof: ' + typeof(broker));
  //var client  = mqtt.connect([{ host: broker, port: port }], options);
  //var client  = mqtt.connect(broker + ':' + port, options);
  var client  = mqtt.connect(broker, options);
  client.on('connect', function () {
    console.log('Calling publish, topic: ' + topic  + ', payload: ' + JSON.stringify(payload));
    client.publish(topic, JSON.stringify(payload));
    console.log('        publish, topic: ' + topicMsg  + ', payload: ' + message);
    client.publish(topicMsg, message);
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
    mqttPublish(errorMsg, { event: 'newOutage', service: service.name, msg: JSON.stringify(outage.error) });
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
    mqttPublish(errorMsg, { event: 'currentOutage', service: service.name, msg: JSON.stringify(outage.error) });
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
    mqttPublish(errorMsg, { event: 'failedCheck', service: service.name, msg: JSON.stringify(outage.error) });
  },

  /**
   * Warning alert
   * @param {Object} service
   * @param {Object} data
   * @param {number} data.elapsedTime (ms)
   */

  onLatencyWarning: function (service, data) {
    var msg = service.name + ' latency warning'.yellow + '. Took: ' + (data.elapsedTime + ' ms.').yellow;
    mqttPublish(msg, { event: 'latencyWarning', service: service.name, elapsedTime: data.elapsedTime });
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
    mqttPublish(errorMsg, { event: 'serviceBack', service: service.name, duration: duration.humanize() });
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
    mqttPublish(serviceOkMsg + ', ' + responseTimeMsg, { event: 'serviceOk', service: service.name, elapsedTime: data.elapsedTime });
  }
};

function MqttPlugin(watchmen) {
  watchmen.on('new-outage', eventHandlers.onNewOutage);
  watchmen.on('current-outage', eventHandlers.onCurrentOutage);
  watchmen.on('service-error', eventHandlers.onFailedCheck);

  watchmen.on('latency-warning', eventHandlers.onLatencyWarning);
  watchmen.on('service-back', eventHandlers.onServiceBack);
  watchmen.on('service-ok', eventHandlers.onServiceOk);
}

exports = module.exports = MqttPlugin;