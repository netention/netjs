Install Netention for Node.JS on Ubuntu Linux
=============================================

Requirements
------------

###Node.JS http://nodejs.org

(latest version, preferably)

####[Install from Package Manager...](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager)

####...or Build & Install from Source Code
Note: See http://nodejs.org to find the latest version, which may be ahead of the one linked in the instructions here.
```
wget http://nodejs.org/dist/v0.10.24/node-v0.10.24.tar.gz
tar xvzf node-v0.10.24.tar.gz 
cd node-v0.10.24/
./configure ; make ; sudo make install
sudo npm -g install always
```

###MongoDB
http://mongodb.org

These packages facilitate the development process:
*   git
*   build-essential (includes GCC/G++)
*   libreoffice (for viewing & editing included documents, spreadsheets, & presentations in doc/ folder)

Install them with:
```
sudo apt-get install build-essential git mongodb
```

Instructions
------------

###The following commands run from the *parent directory in which Netention will be installed*

####Clone the latest Netention source code
```
npm i http://github.com/automenta/netjs/archive/master.tar.gz
```
or...
```
git clone https://github.com/automenta/netjs.git ; cd netjs ; npm install
```

###The following commands run from the *directory where Netention is installed* (ex: 'netjs')

####Begin using Netention default options
```
cp options.js.EXAMPLE options.js

```


####Edit Netention Options
Instructions for each option in options.js, and its possible values, are or will be included here:
[options.js.EXAMPLE](https://github.com/automenta/netjs/blob/master/options.js.EXAMPLE)


####Run Netention Once
```
node netention.js
```

####Run Netention via 'always'
The 'always' node.js utility will automatically restart a node.js application when any of its source code files change.
```
always netention.js
```

####Run Netention via 'always', in background & with no output
```
nohup always netention.js >/dev/null 2>/dev/null &
```

####Update Netention Source Code (from Git) & NPM Dependencies
```
git pull ; npm update
```

####Use proxy.js to serve multiple instances on one server
TODO

####Open a port in iptables firewall
Example:
```
iptables -A INPUT -p tcp --dport 9001 -j ACCEPT
```

####Create an upstart.sh script that automatically runs Netention on system startup:
See: http://howtonode.org/deploying-node-upstart-monit


Install Netention for Node.JS on Windows
========================================
Coming soon.



Install Netention for Node.JS on OSX
========================================
Coming soon.

