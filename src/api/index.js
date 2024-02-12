const express = require('express');
var request = require('request');
//const bodyParser = require('body-parser')

const emojis = require('./emojis');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    message: 'API - 123👋🌎🌍🌏',
  });
});

router.get('/datatest', (req, res) => {
  res.json({
    message: '123API - 123👋🌎🌍🌏',
  });
});

router.get('/lark-product', (req, res) => {
  res.json({
    message: 'lark-product',
  });
});

router.get('/line-product/:forcompany', (req, res) => {
  let thisparam = req.params.forcompany
  
  request({
    url : "https://larkapi.soidea.co/setapidatabase/"+thisparam,
    method: 'POST',
    json: req.body
  }, (error, response, body) => {
    //res.send(body)
    //var bodyparser = JSON.parse(body)
    //let lark_app_api = bodyparser['lark_app_api']
    //let lark_app_secret  = bodyparser['lark_app_secret'] 
    //let linetoken = bodyparser['linetoken']
    res.json(body)
  });     
});

router.get('/whatapp-product', (req, res) => {
  res.json({
    message: 'whatapp-product',
  });
});


router.post('/webhook/line-product/:forcompany', (req, res) => {
  let thisparam = req.params.forcompany
  let datainput = req.body
  request({
    url : "https://larkapi.soidea.co/api/stud/getforcompany/"+thisparam,
  }, (error, response, body) => {
    //res.send(body)
    var bodyparser = JSON.parse(body)
    let lark_app_api = bodyparser['lark_app_api']
    let lark_app_secret  = bodyparser['lark_app_secret'] 
    let linetoken = bodyparser['linetoken']

    res.send(datainput)
  });     
  //res.send(forcompanys)
})
// router.post('/webhook/line-sproduct/:forcompany', (req, res) => {
//   request({
//     url : "https://larkapi.soidea.co/api/stud/getforcompany",
//     headers : { "Authorization" : authenticationHeader }  
//   }, (error, response, body) => {
//      console.log(body);
//   });     
//   let thisparam = req.params.forcompany
//   res.send(forcompanys)
// })


router.use('/emojis', emojis);

module.exports = router;
