# Contributing

This project welcomes contributions and suggestions. Most contributions require you to
agree to a Contributor License Agreement (CLA) declaring that you have the right to,
and actually do, grant us the rights to use your contribution. For details, visit
https://cla.microsoft.com.

When you submit a pull request, a CLA-bot will automatically determine whether you need
to provide a CLA and decorate the PR appropriately (e.g., label, comment). Simply follow the
instructions provided by the bot. You will only need to do this once across all repositories using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/)
or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Installation Steps:
1. Have the latest version of node.js and MongoDB installed.
2. Run `npm i` (in terminal) to install required packages.
2. If using a version of MongoDB different from 3.6, update the file `mongo.cmd` at line
```C:\Program Files\MongoDB\Server\3.6\bin\mongod.exe``` 
to the version of MongoDB installed. (**3.6** to your version)
3. Create a path `uploads/db` in the root of the project. Local MongoDB data will be saved here.
4. Run `mongo.cmd` command first. (double-click cmd file from the file explorer or run `./mongo.cmd` from terminal)
5. Run `complie.cmd` on any changes made.
6. Run `node app` (in terminal) to start running locally at <http://localhost:3000>