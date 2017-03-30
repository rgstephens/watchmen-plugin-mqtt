# MQTT plugin for watchmen

https://github.com/iloire/WatchMen

## Environment Variables

The supported environment variables are listed below. The **WATCHMEN_MQTT_BROKER** value must be set at a minimum. These are shown with example values:

```
WATCHMEN_MQTT_BROKER=mqtt.mosquitto.org
WATCHMEN_MQTT_PORT=1883
WATCHMEN_MQTT_TOPIC=myRootTopic
WATCHMEN_MQTT_USERNAME=myname
WATCHMEN_MQTT_PASSWORD=mypassword
```

## Example MQTT Message

The topic format is `watchmen\<service-name>\<event-name>` where the event names are:

Event|Description|Payload
--|--|--
status| Service up/down | 0=Down, 1=Up (integer)
serviceOk| Service up | latency in ms (integer)
newOutage| Service just went down | Failure message (string)
currentOutageMsg| Service still down | Failure message (string)
currentOutageLength| Service still down | Length of current outage (string)
failedCheck| Check failed | failure count (integer)
latencyWarning| Latency threshold exceeded | latency in ms (integer)
serviceBack| Service back up | Duration of downtime (string)
ipAddr| Watchmen IP Address (sent at startup only) | Interface Name & IP Address (string)


### Example messages

```
watchmen/greghome/Bignion/serviceOk 4130
watchmen/greghome/Bignion/status 1
watchmen/greghome/xyzzy/failedCheck 44
watchmen/greghome/xyzzy/currentOutageMsg Invalid status code. Found: 404. Expected: 200
watchmen/greghome/xyzzy/currentOutageTimestamp 38 minutes ago
```

# Install this Plug-in

Make sure you're first in the Watchmen directory. To install from NPM: 

```
npm install watchmen-plugin-mqtt --save
```

To install from latest Github:

```
npm install https://github.com/rgstephens/watchmen-plugin-mqtt.git --save
```

# Raspberry Pi Setup Instructions

I'm running Watchmen on a Raspberry Pi with Raspbian. I've written instructions on setting up Watchmen on Raspberry Pi [here](http://flnkr.com/2017/03/watchmen-website-monitor-on-raspberry-pi/).
