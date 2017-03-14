var mqtt = require('mqtt');
var moment = require('moment');

var mqttParams = {
  //port: process.env.WATCHMEN_MQTT_BROKER_PORT,
  broker: process.env.WATCHMEN_MQTT_BROKER,
  topic: process.env.WATCHMEN_MQTT_TOPIC
};

function mqttPublish(payload) {
  var broker = mqttParams.broker ? mqttParams.broker : 'mqtt://test.mosquitto.org';
  var topic = mqttParams.topic ? mqttParams.topic : 'watchmen';
  console.log('mqttPublish, broker: ' + broker + ', topic: ' + topic + ', payload: ' + JSON.stringify(payload));
  var client  = mqtt.connect(broker);
  client.on('connect', function () {
    client.publish(topic, payload);
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
    console.log(errorMsg);
    mqttPublish({ event: 'newOutage', service: service.name, msg: JSON.stringify(outage.error) });
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
    console.log(errorMsg);
    mqttPublish({ event: 'currentOutage', service: service.name, msg: JSON.stringify(outage.error) });
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
    console.log(errorMsg);
    mqttPublish({ event: 'failedCheck', service: service.name, msg: JSON.stringify(outage.error) });
  },

  /**
   * Warning alert
   * @param {Object} service
   * @param {Object} data
   * @param {number} data.elapsedTime (ms)
   */

  onLatencyWarning: function (service, data) {
    var msg = service.name + ' latency warning'.yellow + '. Took: ' + (data.elapsedTime + ' ms.').yellow;
    console.log(msg);
    mqttPublish({ event: 'latencyWarning', service: service.name, elapsedTime: data.elapsedTime });
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
    console.log(service.name.white + ' is back'.green + '. Down for '.gray + duration.humanize().white);
    mqttPublish({ event: 'serviceBack', service: service.name, duration: duration.humanize() });
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
    console.log(serviceOkMsg, responseTimeMsg.gray);
    mqttPublish({ event: 'serviceOk', service: service.name, elapsedTime: data.elapsedTime });
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