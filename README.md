# wptest
Prototyping a tool to reduce webplatform issues to tests

## Installation Steps:
1. Have the latest version of node.js and MongoDB installed.
2. Run `npm i` (in terminal) to install required packages.
2. If using a version of MongoDB different from 3.4, update the `mongo.cmd` at 
```C:\Program Files\MongoDB\Server\3.4\bin\mongod.exe``` 
to the version of MongoDB installed. (**3.4** to your version)
3. Create a path `uploads/db` in the root of the project. Local MongoDB data will be saved here.
4. Run `mongo.cmd` command first. (double-click cmd file from file explorer or run `./mongo.cmd` from terminal)
5. Run `complie.cmd` on any changes made.
6. Run `node app` (in terminal) to start running locally at <http://localhost:3000>
