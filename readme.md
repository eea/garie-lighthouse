![reports](./screenshots/logo.png "Reports")

<p align="center">
  <p align="center">Tool to gather lighthouse metrics and supports CRON jobs and webhooks.<p>
  <p align="center"><a href="https://travis-ci.org/boyney123/garie-lighthouse"><img src="https://img.shields.io/travis/boyney123/garie-lighthouse/master.svg" alt="Build Status"></a>
    <a href="https://codecov.io/gh/boyney123/garie-lighthouse/"><img src="https://img.shields.io/codecov/c/github/boyney123/garie-lighthouse.svg" alt="Codecov"></a>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="MIT"></a>

  </p>
</p>



__Highlights__

- Poll for lighthouse performance metrics on any website and stores the data into InfluxDB
- Webhook support
- Understand your performance metrics with recommened improvements thanks to lighthouse reports
- View all historic lighthouse reports.
- Setup within minutes

## Overview of garie-lighthouse

Garie-lighthouse was developed as a plugin for the [Garie](https://github.com/boyney123/garie) Architecture.

[Garie](https://github.com/boyney123/garie) is an out the box web performance toolkit, and `garie-lighthouse` is a plugin that generates and stores lighthouse data into `InfluxDB`.

`Garie-lighthouse` can also be run outside the `Garie` environment and run as standalone. 

If your interested in an out the box solution that supports multiple performance tools like `lighthouse`, `google-speed-insight` and `web-page-test` then checkout [Garie](https://github.com/boyney123/garie).

If you want to run `garie-lighthouse` standalone you can find out how below.


## Getting Started

### Prerequisites

- Docker installed

### Running garie-lighthouse

You can get setup with the basics in a few minutes.

First clone the repo.

```sh
git clone git@github.com:boyney123/garie-lighthouse.git
````

Next setup you're config. Edit the `lighthouse-config.json` and add websites to the list.


```javascript
{
	"cron": "00 00 */6 * * *",
	"urls": [
		{
			"url": "https://www.comparethemarket.com",
			"report": true
		},
		{
			"url": "https://www.bbc.co.uk",
			"report": true
		},
		{
			"url": "https://www.cnn.com",
			"report": true
		}
	]
}
```

Once you finished edited your config, lets build our docker image and setup our environment.

```sh
docker build -t garie-lighthouse . && docker-compose up
```

This will build your copy of `garie-lighthouse` and run the application.

On start garie-lighthouse will start to gather performance metrics for the websites added to the `lighthouse-config.json`.

## Viewing reports

Viewing lighthouse reports is straight forward. Once you have your application running just go to `localhost:3000/reports` and you should see all the reports lighthouse has generated.

![reports](./screenshots/reports.png "Reports")
![reports](./screenshots/lighthouse.png "Reports")


If you don't want to generate reports you can turn this off in the `lighthouse-config.json` by setting `report` to false.

## Webhook

Garie-lighthouse also supports webhooks. You will need to `POST` to `localhost:3000/collect`.

__Payload__

| Property | Type | Description |
| --- | --- | --- |
| `url` | `string` (required) | Url to get metrics for. |
| `report` | `boolean` (optional) | When set to true a lighthouse report will be generated |

__Payload Example__

```javascript
{
  "url": "https://www.bbc.co.uk",
  "report": true
}
```

_By default, reports on webhook's are not generated unless you set `report` to true_

## lighthouse-config.json

| Property | Type | Description |
| --- | --- | --- |
| `cron` | `string` (optional) | Cron timer. Supports syntax can be found [here].(https://www.npmjs.com/package/cron) |
| `urls` | `object` (required) | Config for lighthouse. More detail below |

__urls object__

| Property | Type | Description |
| --- | --- | --- |
| `url` | `string` (required) | Url to get lighthouse metrics for. |
| `report` | `boolean` (optional) | If set to true, lighthouse report will also be generated. |

