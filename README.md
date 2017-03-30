# MQTT plugin for watchmen

https://github.com/iloire/WatchMen

## Environment Variables

```
WATCHMEN_MQTT_BROKER
WATCHMEN_MQTT_PORT
WATCHMEN_MQTT_TOPIC
WATCHMEN_MQTT_USERNAME
WATCHMEN_MQTT_PASSWORD
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

I'm running Watchmen on a Raspberry Pi with Raspbian and I'm starting it via Systemd.

### Debug

Console messages under Systemd with Raspbian are written to /var/log/daemon.log

## Raspberry Pi Complete Install Steps

```
curl -sSL https://get.docker.com | sh
git clone https://github.com/iloire/watchmen.git
cd watchmen
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

Change the following line to match the Watchmen install directory location:

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

Setup any watchmen environment variables you want in the `.env` file:

```
WATCHMEN_WEB_NO_AUTH=true
WATCHMEN_REDIS_DB_PRODUCTION=1
```

Install Foreman

```
sudo npm install -g foreman
```

Run the Foreman start command to confirm that Foreman is correctly starting Watchmen and browse to port 3000 of the Raspberry Pi to insure that you see Watchmen.

```
nf start
```
 
Create a ste of [Systemd](http://www.tecmint.com/create-new-service-units-in-systemd/) startup files with foreman

```
sudo 
```

The following files are created:

```
watchmen-monitor-1.service   # Starts run-monitor-server.js
watchmen-monitor.target      # Requires watchmen.target, Wants watchmen-monitor-1.service
watchmen.target              # Wanted-by multi-user.target, Wants watchmen-monitor.target watchmen-web.target
watchmen-web-1.service       # Starts run-web-server.js
watchmen-web.target          # Requires watchmen.target, Wants watchmen-web-1.service
```

Enable the service:

```
sudo systemctl enable watchmen.target
```

The [Systemd](https://access.redhat.com/documentation/en-US/Red_Hat_Enterprise_Linux/7/html/System_Administrators_Guide/sect-Managing_Services_with_systemd-Unit_Files.html) start-up files are stored under `/etc/systemd/system`.

You need to tell Systemd about the new config files with this command:

```
sudo systemctl daemon-reload
```

You can start and stop Watchmen with these commands:

```
sudo systemctl start watchmen.target
```
