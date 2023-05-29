const express = require('express');
const axios = require('axios');
const { parseString } = require('xml2js');
const cheerio = require('cheerio');

const app = express();
const port = 3000;

let cache = []
let cacheTime = 0

parseXML = (xmlData) => new Promise((resolve, reject) => parseString(xmlData, (error, result) => error ? reject(error) : resolve(result)));
getDescription = async (url) => {
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      const descriptionMetaTag = $('meta[name="description"]');
      const description = descriptionMetaTag.attr("content");
      return description;
    } catch (error) {
      console.log("An error occurred while fetching the page:", error);
      return null;
    }
  };
  

app.get('/rss', async (req, res) => {
    if (cacheTime > Date.now() - 30 * 1000) {
      return res.json(cache);
    }
    try {
        cacheTime = Date.now();
      const url = 'https://news.yahoo.com/rss/world';
      const response = await axios.get(url);
      let parsedData = await parseXML(response.data);
  
      // Filter data
      parsedData = parsedData.rss.channel[0].item.filter(
        item =>
          item['media:content'] &&
          item['media:content'][0]['$'] &&
          item.link[0].startsWith('https://news.yahoo.com/')
      );
  
      let rssData = await Promise.all(
        parsedData.map(async item => {
          const description = await getDescription(item.link[0]);
          return {
            title: item.title[0],
            link: item.link[0],
            pubDate: item.pubDate[0],
            thumbnail: item['media:content'] ? item['media:content'][0]['$'] : null,
            content: description
          };
        })
      );
        rssData = rssData.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
      
        cache = rssData;    
      res.json(rssData);
    } catch (error) {
      console.error('Error fetching RSS data:', error);
      res.status(500).json({ error: 'Error fetching RSS data' });
    }
  });
  

app.listen(port, () => {
    console.log(`REST API server is running on port ${port}`);
});
