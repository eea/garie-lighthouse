![reports](./screenshots/logo.png 'Reports')

<p align="center">
  <p align="center">Tool to gather lighthouse metrics and supports CRON jobs.<p>
  </p>
</p>

**Highlights**

-   Poll for lighthouse performance metrics on any website and stores the data into InfluxDB
-   Understand your performance metrics with recommend improvements thanks to lighthouse reports
-   View all historic lighthouse reports.
-   Setup within minutes

## Overview of garie-lighthouse

Garie-lighthouse was developed as a plugin for the [Garie](https://github.com/boyney123/garie) Architecture.

[Garie](https://github.com/boyney123/garie) is an out the box web performance toolkit, and `garie-lighthouse` is a plugin that generates and stores lighthouse data into `InfluxDB`.

`Garie-lighthouse` can also be run outside the `Garie` environment and run as standalone.

If your interested in an out the box solution that supports multiple performance tools like `lighthouse`, `google-speed-insight` and `web-page-test` then checkout [Garie](https://github.com/boyney123/garie).

If you want to run `garie-lighthouse` standalone you can find out how below.

## Getting Started

### Prerequisites

-   Docker installed

### Running garie-lighthouse

You can get setup with the basics in a few minutes.

First clone the repo.

```sh
git clone https://github.com/eea/garie-lighthouse.git
```

Next setup you're config. Edit the `config.json` and add websites to the list.

```javascript
{
  "plugins":{
        "lighthouse":{
            "cron": "0 */4 * * *"
        }
    },
  "urls": [
    {
      "url": "https://www.eea.europa.eu/"
    },
    {
      "url": "https://biodiversity.europa.eu/"
    }
  ]
}
```

Once you finished edited your config, lets build our docker image and setup our environment.

```sh
docker build -t garie-lighthouse . && docker-compose up
```

This will build your copy of `garie-lighthouse` and run the application.

On start garie-lighthouse will start to gather performance metrics for the websites added to the `config.json`.

## Data collected

Lighthouse comes with loads of audits out the box. You can view all metrics in the reports.

Garie-lighthouse filters what data is stored into influxDB.

| Property                | Type     | Description                             |
| ----------------------- | -------- | --------------------------------------- |
| `performance-score`     | `number` | Overall performance score.              |
| `pwa-score`             | `number` | Overall progressive web app score.      |
| `accessibility-score`   | `number` | Overall accessibility score.            |
| `best-practices-score`  | `number` | Overall best practices score.           |
| `seo-score`             | `number` | Overall seo score.                      |
| `time-to-first-byte`    | `number` | Number of ms to first byte.             |
| `firstContentfulPaint`  | `number` | Number of ms to first contentful paint. |
| `firstMeaningfulPaint`  | `number` | Number of ms to first meaningful paint. |
| `interactive`           | `number` | Number of ms to interactive.            |
| `firstCPUIdle`          | `number` | Number of ms to CPU idle.               |
| `speedIndex`            | `number` | Google speed index.                     |
| `estimatedInputLatency` | `number` | Input Latency.                          |
| `errors-in-console`     | `number` | Number of errors in the console.        |
| `redirects`             | `number` | Number of redirects.                    |
| `redirects`             | `number` | Number of redirects.                    |


## config.json

| Property | Type                | Description                                                                          |
| -------- | ------------------- | ------------------------------------------------------------------------------------ |
| `plugins.lighthouse.cron`   | `string` (optional) | Cron timer. Supports syntax can be found [here].(https://www.npmjs.com/package/cron) |
| `plugins.lighthouse.retry`   | `object` (optional) | Configuration how to retry the failed tasks |
| `plugins.lighthouse.retry.after`   | `number` (optional, default 30) | Minutes before we retry to execute the tasks |
| `plugins.lighthouse.retry.times`   | `number` (optional, default 3) | How many time to retry to execute the failed tasks |
| `plugins.lighthouse.retry.timeRange`   | `number` (optional, default 360) | Period in minutes to be checked in influx, to know if a task failed |
| `urls`   | `object` (required) | Config for lighthouse. More detail below                                             |

MAX_AGE_OF_REPORT_FILES - int (default to 365), Maximum age (in days) of report files that can be deleted.
MAX_AGE_OF_REPORT_VIDEOS - int (default to 100), Maximum age (in days) of report videos that can be deleted.
CRON_DELETE_OLD_REPORTS - cronjob (default to '0 5 * * *') The frequency of checking old report files / videos.

**urls object**

| Property         | Type                 | Description                                               |
| ---------------- | -------------------- | --------------------------------------------------------- |
| `url`            | `string` (required)  | Url to get lighthouse metrics for.                        |

For more information please go to the [garie-plugin](https://github.com/eea/garie-plugin) repo.

