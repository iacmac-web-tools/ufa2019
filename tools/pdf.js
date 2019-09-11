const puppeteer = require('puppeteer');
const {Logger, LogLevel} = require('plop-logger');
const {colorEmojiConfig} = require('plop-logger/lib/extra/colorEmojiConfig');
const handler = require('serve-handler');
const http = require('http');

Logger.config = colorEmojiConfig;
Logger.config.defaultLevel = LogLevel.Debug;
const logger = Logger.getLogger('pdf');

// Configuration

const serverConf = {
  port: 8765,
  options: {
    "public": "./docs"
  }
};
const browserConf = {
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  defaultViewport: {width: 1280, height: 1700},
  margin: {
    top: "0cm",
    right: "0cm",
    bottom: "0cm",
    left: "0cm"
  },
  devtools: false
};

async function startServer({port, options}) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) =>
      handler(request, response, options));

    server.listen(port, err => {
      if (err) {
        logger.error('Fail to start server', err);
        reject(err);
      } else {
        logger.info('Server started', () => `http://localhost:${port}`);
        resolve(server);
      }
    });
  });
}

async function stopServer(server) {
  return new Promise((resolve, reject) => {
    logger.info('Stopping server...');
    server.close(err => {
      if (err) {
        logger.error('Fail to stop server', err);
        reject(err);
      } else {
        logger.info('Server stopped');
        resolve();
      }
    });
  });
}

async function cleanupBeforePrint(page) {
  const toHide = [
    'body > header',
    'body > footer',
    'main .hero',
    'main .day-tabs'
  ];

  await page.$$eval(toHide.join(','), elts =>
    elts.forEach(elt =>
      elt.parentNode.removeChild(elt)));

  await page.addStyleTag({
    content: '@page { size: auto; }',
  });
}

(async () => {
  const server = await startServer(serverConf);

  logger.info("launch puppeteer browser");
  const browser = await puppeteer.launch(browserConf);
  try {
    logger.info("open new page");
    const format = 'A4';
    const landscape = false;
    const margin = { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' };
    const printBackground = false;


    // DAY 1
    const page = await browser.newPage();
    const scale = .48;
    const file = 'schedule/#day_2019-10-17';
    const output = 'static/schedule/day_2019-10-17.pdf';
    const url = `http://localhost:${serverConf.port}/${file}`;
    logger.info("go to", url);
    const pageResponse = await page.goto(url, {waitUntil: 'networkidle2'});
    logger.debug("done", pageResponse.statusText());
    await cleanupBeforePrint(page);
    logger.info('export pdf', output);
    await page.pdf({path:output, format, scale, printBackground, landscape, margin });

    // DAY 2
    const page2 = await browser.newPage();
    const scale2 = .46;
    const file2 = 'schedule/#day_2019-10-18';
    const output2 = 'static/schedule/day_2019-10-18.pdf';
    const url2 = `http://localhost:${serverConf.port}/${file2}`;
    logger.info("go to", url2);
    const pageResponse2 = await page2.goto(url2, {waitUntil: 'networkidle2'});
    logger.debug("done", pageResponse2.statusText());
    await cleanupBeforePrint(page2);
    logger.info('export pdf', output2);
    await page2.pdf({path:output2, format, scale: scale2, printBackground, landscape, margin });

    logger.debug("pdf done");

  } catch (e) {
    console.error(e);
    logger.error('Oops!', e);
  } finally {
    logger.info('close puppeteer browser');
    await browser.close();
    await stopServer(server);
  }
})();