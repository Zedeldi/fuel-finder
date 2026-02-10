# fuel-finder

[![GitHub license](https://img.shields.io/github/license/Zedeldi/fuel-finder?style=flat-square)](https://github.com/Zedeldi/fuel-finder/blob/master/LICENSE) [![GitHub last commit](https://img.shields.io/github/last-commit/Zedeldi/fuel-finder?style=flat-square)](https://github.com/Zedeldi/fuel-finder/commits) [![Code style: black](https://img.shields.io/badge/code%20style-prettier-1a2b34.svg?style=flat-square)](https://prettier.io/)

TypeScript client for the Fuel Finder API.

## Description

`Client` provides base methods to authenticate and fetch both fuel station and
price data from the [UK government Fuel Finder API](https://www.fuel-finder.service.gov.uk/),
optionally caching results.

`ClientService` extends the client to provide an auto-refreshing service,
transforming data into a mapping of node IDs to station and price information.

Starting the project will create an Express server with endpoints to return data
from the service.

## Installation

After cloning the repository with: `git clone https://github.com/Zedeldi/fuel-finder.git`

1. Install dependencies: `npm install`
2. Start Express server: `npm start`

### Dependencies

- [Express](https://expressjs.com/) - Web framework

## Resources

- [Fuel Finder](https://www.fuel-finder.service.gov.uk/) - UK government service

## License

`fuel-finder` is licensed under the [MIT Licence](https://mit-license.org/) for
everyone to use, modify and share freely.

This project is distributed in the hope that it will be useful, but without any
warranty.

## Donate

If you found this project useful, please consider donating. Any amount is
greatly appreciated! Thank you :smiley:

[![PayPal](https://www.paypalobjects.com/webstatic/mktg/Logo/pp-logo-150px.png)](https://paypal.me/ZackDidcott)
