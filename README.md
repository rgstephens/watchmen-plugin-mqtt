# MQTT plugin for watchmen

https://github.com/iloire/WatchMen

## Environment Variables

WATCHMEN_MQTT_BROKER
WATCHMEN_MQTT_PORT
WATCHMEN_MQTT_TOPIC
WATCHMEN_MQTT_USERNAME
WATCHMEN_MQTT_PASSWORD

## Example MQTT Message

The topic format is `watchmen\<service-name>\<event-name>` where the event names are:

Event|Description|Payload
--|--|--
status| Service up/down | Integer (0=Down, 1=Up)
newOutage| Service just went down | {event: '', service: '<service-name>', msg: 'message'}
currentOutage| Service still down | {event: '', service: '<service-name>', msg: 'message'}
failedCheck| Check failed | {event: '', service: '<service-name>', msg: 'message'}
latencyWarning| Latency threshold exceeded | {event: '', service: '<service-name>', msg: 'message'}
serviceBack| Service back up | {event: '', service: '<service-name>', msg: 'message'}
serviceOk| Service up | {event: '', service: '<service-name>', elapsedTime: <millesecond response>}

### JSON Message

```
topic: watchmen/GolfGenius/serviceOk
payload: {"event":"serviceOk","service":"GolfGenius Page","elapsedTime":1052}
```

### Text Message

```
topic: watchmen/msg/GolfGenius/serviceOk
payload: BGC responded OK!, 721 ms.
```

# Raspberry Pi Setup Instructions

I'm running Watchmen on a Raspberry Pi with Raspbian and I'm starting it via Systemd.

### Debug

Console messages under Systemd with Raspbian are written to /var/log/daemon.log

### More example messages

```
watchmen/BGC/serviceOk {"event":"serviceOk","service":"BGC","elapsedTime":369}
watchmen/msg/BGC/serviceOk BGC responded OK!, 369 ms.
watchmen/BHA/serviceOk {"event":"serviceOk","service":"BHA","elapsedTime":512}
watchmen/msg/BHA/serviceOk BHA responded OK!, 512 ms.
watchmen/GolfGeniusBGC/serviceOk {"event":"serviceOk","service":"GolfGeniusBGC","elapsedTime":626}
watchmen/msg/GolfGeniusBGC/serviceOk GolfGeniusBGC responded OK!, 626 ms.
```

## Raspberry Pi Complete Install Steps

```
curl -sSL https://get.docker.com | sh
git clone https://github.com/iloire/watchmen.git
cd watchmen
```

Customize the `docker-compose.env` file as needed

```
docker-compose build
docker-compose up
```

## Raspberry Pi Complete Install Steps

These are the steps to setup Watchmen on a Raspberry Pi

### Install Redis

More detailed instructions are [here](http://mjavery.blogspot.com/2016/05/setting-up-redis-on-raspberry-pi.html).

```
sudo apt-get update
sudo apt-get install -y redis-server
```

Change startup config file `/etc/systemd/system/multi-user.target.wants/redis-server.service`

Change the line:

```
ExecStart=/usr/bin/redis-server /etc/redis/redis.conf
```

to

```
ExecStart=/usr/bin/redis-server /home/pi/watchmen/redis.conf
```

Start and check the status of the redis server:

```
sudo systemctl daemon-reload
sudo systemctl start redis-server
redis-cli ping  or  redis-cli -p 1216 ping
sudo systemctl status redis-server
```

### Install Node.js

There a number of sources for installation instructions. Several options are described [here](https://node-arm.herokuapp.com/) Version 7.7.2 are [here](http://thisdavej.com/beginners-guide-to-installing-node-js-on-a-raspberry-pi/).

Install node.js on Raspberry Pi 2 & 3

```
curl -sL https://deb.nodesource.com/setup_7.x | sudo -E bash -
sudo apt install nodejs
node -v
```

Install node.js on Raspberry Pi B+

```
wget http://node-arm.herokuapp.com/node_latest_armhf.deb
sudo dpkg -i node_archive_armhf.deb
```

Confirm installed version

```
node -v
```

### Install watchmen

```
sudo apt-get -y install git
git clone https://github.com/iloire/watchmen.git
cd watchmen
npm install
```

Change the data directory in the `redis.conf` file to the watchmen home directory. 

**The default redis port is `1216` but this may also need to be changed.**

Optionally run the full tests:

```
npm test
```

#### Manually start

```
redis-server redis.conf
node run-monitor-server.js
node run-web-server.js
```

#### Setup watchmen Env to auto-start with Foreman

Setup any watchmen environment variables you want in the .env file:

```
WATCHMEN_WEB_NO_AUTH=true
WATCHMEN_REDIS_DB_PRODUCTION=1
```

```
npm install -g foreman
nf start
```

Setup Systemd startup files with foreman

```
nf export -t systemd
```

You need to tell Systemd about the new config files with this command:

```
sudo systemctl daemon-reload
```

You can start and stop Watchmen with these commands:

```
sudo systemctl start foreman.service
```

### Install this plugin from Git

```
npm install 
```