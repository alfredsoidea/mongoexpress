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
    message: 'lark-product'
  });
});

router.post('/line-product/:forcompany', (req, res) => {
  let thisparam = req.params.forcompany
  var getuserdata = "test";
  var requestbody = req.body
  var allmessage = requestbody['events']
  let countallmessage = 0;
  var thisstoken = "";
  var userId = allmessage[0]['source']['userId']
  var sendtext = "";

  request({
    url : "https://larkapi.soidea.co/api/stud/getuserline/"+thisparam+"/"+userId,
    method: 'GET'
  }, (error, response, body) => {
    var bodyparser = JSON.parse(body)
    var thiscompany = bodyparser['forcompany']
    let lark_app_api = thiscompany['lark_app_api']
    let lark_app_secret  = thiscompany['lark_app_secret'] 
    let linetoken = thiscompany['linetoken']
    let datasendtext
    request({
      url : "https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal",
      method: 'POST',
      header: "Content-type: application/json; charset=utf-8",
      form: {
        'app_id': lark_app_api,
        'app_secret': lark_app_secret
      }
    }, (error_token, response_token, body_token) => {
      thisstoken = JSON.parse(body_token)['tenant_access_token']
      allmessage.forEach((currentElement, index) => {
        datasendtext = "";
        let thismessagetype = currentElement['message']['type']
        switch(thismessagetype) {
          case 'text':
            datasendtext = currentElement['message']['text'];
            request({
              url : "https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id",
              headers: {
                'Authorization': 'Bearer '+thisstoken,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              method: 'POST',
              json: {
                "receive_id": bodyparser['larkchatid'],
                "msg_type": "text",
                "content": JSON.stringify({ "text": datasendtext})
              }
            }, (error_textmess, response_textmess, body_textmess) => {
              
            })
            break;
          case 'sticker':
            datasendtext = currentElement['message']['text'];
            request({
              url : "https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id",
              headers: {
                'Authorization': 'Bearer '+thisstoken,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              method: 'POST',
              json: {
                "receive_id": bodyparser['larkchatid'],
                "msg_type": "text",
                "content": JSON.stringify({ "text": "[sticker]" })
              }
            }, (error_textmess, response_textmess, body_textmess) => {
              
            })
            break;
          case 'image':
            fetch("https://api-data.line.me/v2/bot/message/"+currentElement['message']['id']+"/content", {
              method: 'get',
              headers: {
                'Authorization': 'Bearer '+linetoken
              }
            }).then((response) => response.blob()).then((myBlob) => {
              const objectURL = URL.createObjectURL(myBlob);
              request({
                url : "https://open.larksuite.com/open-apis/im/v1/images",
                method: 'post',
                headers: {
                  'Authorization': 'Bearer '+thisstoken,
                  'Content-Type': 'multipart/form-data'
                },
                form: {
                  "image_type": "message",
                  "image": objectURL
                }
              },(error_textimage, response_textimage, body_textimage) => {
                request({
                  url : "https://larkapi.soidea.co/setapidatabase/"+thisparam,
                  json: response_textimage,
                  method: 'post'
                })
              })
            });
            break;
          case 'video':
            datasendtext = currentElement['message']['id'];
            request({
              url : "https://api-data.line.me/v2/bot/message/"+currentElement['message']['id']+"/content",
              headers: {
                'Authorization': 'Bearer '+linetoken,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              method: 'GET'
            }, (error_imagemess, response_imagemess, body_imagemess) => {
              datasendtext = body_imagemess
            })
            break;
          default:
        }
        countallmessage = countallmessage + 1
      })
      
      res.send(datasendtext)
    })
  });
});

router.get('/whatapp-product', (req, res) => {
  res.json({
    message: 'whatapp-product',
  });
});

router.use('/emojis', emojis);

module.exports = router;
