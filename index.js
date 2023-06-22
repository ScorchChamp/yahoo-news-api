const express = require('express');
const axios = require('axios');
const { parseString } = require('xml2js');
const cheerio = require('cheerio');

const app = express();
const port = 3000;

let cache = {}
let cacheTimes = {}

parseXML = (xmlData) => new Promise((resolve, reject) => parseString(xmlData, (error, result) => error ? reject(error) : resolve(result)));
getDescription = async (url) => {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
      }
    });
    const $ = cheerio.load(response.data);
    const descriptionMetaTag = $('div[class="caas-body"]');
    return descriptionMetaTag.contents().map((i, el) => $(el).text()).get().join('. ').replaceAll("..", ".").replaceAll("  ", " ");
  } catch (error) {
    console.log(url)
    console.log("An error occurred while fetching the page");
    return null;
  }
};

app.get('/topic/:topic', async (req, res) => {
  const { topic } = req.params;
  if (cacheTimes[topic] && cacheTimes[topic] > Date.now() - 30 * 1000) {
    return res.json(cache[topic]);
  }
  try {
    cacheTimes[topic] = Date.now();
    let url = '';
    switch (topic) {
      case 'news':
        url = 'https://www.yahoo.com/news/rss';
        break;
      case 'finance':
        url = 'https://finance.yahoo.com/news/rssindex';
        break;
      case 'sports':
        url = 'https://sports.yahoo.com/rss/';
        break;
      case 'entertainment':
        url = 'https://www.yahoo.com/entertainment/rss';
        break;
      case 'politics':
        url = 'https://www.yahoo.com/news/politics/rss';
        break;
      case 'science':
        url = 'https://www.yahoo.com/news/science/rss';
        break;
      case 'lifestyle':
        url = 'https://www.yahoo.com/lifestyle/rss';
        break;
      default:
        return res.status(404).json({ error: 'Page Not found' });
    }

    let response;
    try {
      response = await axios.get(url);
    } catch (error) {
      return res.status(404).json({ error: 'Page Not found' });
    }
    let parsedData = await parseXML(response.data);

    // Filter data
    parsedData = parsedData.rss.channel[0].item.filter(
      item =>
        item['media:content'] &&
        item['media:content'][0]['$'] &&
        item.link[0].startsWith(`https://${topic}.yahoo.com`)
    );

    let rssData = await Promise.all(
      parsedData.map(async item => {
        const description = await getDescription(item.link[0]);
        if (!description) return null;
        return {
          title: item.title[0],
          link: item.link[0],
          pubDate: item.pubDate[0],
          thumbnail: item['media:content'] ? item['media:content'][0]['$'] : null,
          content: description
        };
      })
    );
    rssData = rssData.filter(item => item !== null);
    rssData = rssData.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    cache[topic] = rssData;
    res.json(rssData);
  } catch (error) {
    console.log(error)
    console.error('Error fetching RSS data');
    res.status(500).json({ error: 'Error fetching RSS data' });
  }
});

app.listen(port, () => {
  console.log(`REST API server is running on port ${port}`);
});
