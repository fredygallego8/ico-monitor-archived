# ICOMonitor

[![Greenkeeper badge](https://badges.greenkeeper.io/Neufund/ico-monitor.svg?token=2283404e354d5068bdda9ba6e38f7368ac6bbdfea714cfae837579c23c19904c&ts=1493976128244)](https://greenkeeper.io/)
Simple tool written by Javascript that allow you to monitor any ICO dynamically by adding some config into config.js file, and it gives you simple chart to show the transactions per day.

# Installation
git clone this repo.

# Testing
You need to install all the dependencies.
<pre>
npm install
</pre>
You should have this dependencies:

<pre>
npm install babel-preset-es2015
npm install mock-local-storage
</pre>
Make sure that you have the correct testing path in package.json file
<pre>
{
    "test":"./node_modules/mocha/bin/mocha -r mock-local-storage --compilers js:babel-core/register test/index.js "
}
</pre>

Finally
<pre>
npm test
</pre>

# Run the service
<pre>
npm run dev
</pre>

Then go to localhost:8080 or localhost:8081
