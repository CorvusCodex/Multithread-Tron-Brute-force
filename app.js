"use strict";

process.title = "Multithread Tron Bruteforce by CorvusCodex";

//Creaded by: Corvus Codex
//Github: https://github.com/CorvusCodex/
//Licence : MIT License

//Support my work:
//BTC: bc1q7wth254atug2p4v9j3krk9kauc0ehys2u8tgg3
//ETH & BNB: 0x68B6D33Ad1A3e0aFaDA60d6ADf8594601BE492F0
//Buy me a coffee: https://www.buymeacoffee.com/CorvusCodex

// Importing required modules
const CoinKey = require('coinkey');
const fs = require('fs');
const crypto = require('crypto');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const blessed = require('blessed');
const bip39 = require('bip39');
const hdkey = require('hdkey');
const bs58check = require('bs58check');
const createHash = require('create-hash');

// Initializing a Set to store addresses
let addresses;
addresses = new Set();

// Reading data from a file named 'data.txt'
const data = fs.readFileSync('./data.txt');
// Splitting the data by new line and adding each address to the Set
data.toString().split("\n").forEach(address => addresses.add(address));

// Initializing an object to store counts for each worker
let counts = {};

// Function to generate a private key and check if the corresponding public address is in the Set of addresses
async function generate() {
 // Incrementing the count for the current worker
 counts[cluster.worker.id] = (counts[cluster.worker.id] || 0) + 1;
 // Sending the updated counts to the master process
 process.send({counts: counts});

 const mnemonic = bip39.generateMnemonic();
    const seedBuffer = await bip39.mnemonicToSeed(mnemonic);
    const root = hdkey.fromMasterSeed(seedBuffer);
    const child = root.derive("m/44'/195'/0'/0/0");
    const privateKey = child.privateKey.toString('hex');
    const publicKey = child.publicKey;
    const hash = createHash('sha3-256').update(publicKey).digest();
    const addressBytes = [0x41, ...hash.slice(-20)];
    const address = bs58check.encode(Buffer.from(addressBytes));
 // Checking if the public address corresponding to the private key is in the Set of addresses
 if(addresses.has(address)){
 console.log("");
 // Making a beep sound
 process.stdout.write('\x07');
 // Logging success message with the public address in green color
 console.log("\x1b[32m%s\x1b[0m", ">> Match Found: " + address);
 var successString = "Wallet: " + address + "\n\nSeed: " + mnemonic;

 // Saving the wallet and its private key (seed) to a file named 'match.txt'
 fs.writeFileSync('./match.txt', successString, (err) => {
 if (err) throw err;
 })
 // Exiting the process
 process.exit();
 }
}

// Checking if the current process is the master process
if (cluster.isMaster) {
 // Creating a blessed screen object
 let screen = blessed.screen({
 smartCSR: true
 });

 // Initializing an array to store boxes for each worker
 let boxes = [];

 // Looping through each CPU and creating a box for each worker
 for (let i = 0; i < numCPUs; i++) {
 let box = blessed.box({
 top: `${i * 100/numCPUs}%`,
 left: 0,
 width: '100%',
 height: `${100/numCPUs}%`,
 content: `Worker ${i+1} Loop count: 0`,
 border: {
 type: 'line'
 },
 style: {
 border: {
 fg: 'blue'
 }
 }
 });
 screen.append(box);
 boxes.push(box);
 }

 // Rendering the screen
 screen.render();

 // Listening for messages from worker processes
 cluster.on('message', (worker, message) => {
 if (message.counts) {
 for (let workerId in message.counts) {
 boxes[workerId-1].setContent(`Worker ${workerId} Loop count: ${message.counts[workerId]}`);
 }
 screen.render();
 }
 });

 // Forking worker processes for each CPU
 for (let i = 0; i < numCPUs; i++) {
 cluster.fork();
 }

 // Listening for exit event of worker processes
 cluster.on('exit', (worker, code, signal) => {
 console.log(`worker ${worker.process.pid} died`);
 });
} else {
 // Setting an interval to run the generate function repeatedly with no delay
 setInterval(generate, 0);
}
