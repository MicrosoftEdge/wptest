# [wptest](https://wptest.center/#/new)
Prototyping a tool to reduce webplatform issues to tests.

## Contributing

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
1. Run `npm i` (in terminal) to install required packages.
1. If using a version of MongoDB different from 3.6, update the file `mongo.cmd` at line
```C:\Program Files\MongoDB\Server\3.6\bin\mongod.exe``` 
to the version of MongoDB installed. (**3.6** to your version)
1. Create a path `uploads/db` in the root of the project. Local MongoDB data will be saved here.
1. Run `mongo.cmd` command first. (double-click cmd file from the file explorer or run `./mongo.cmd` from terminal)
1. Run `complie.cmd` on any changes made.
1. Run `node app` (in terminal) to start running locally at <http://localhost:3000>


## Reporting Security Issues

Security issues and bugs should be reported privately, via email, to the Microsoft Security
Response Center (MSRC) at [secure@microsoft.com](mailto:secure@microsoft.com). You should
receive a response within 24 hours. If for some reason you do not, please follow up via
email to ensure we received your original message. Further information, including the
[MSRC PGP](https://technet.microsoft.com/en-us/security/dn606155) key, can be found in
the [Security TechCenter](https://technet.microsoft.com/en-us/security/default).
