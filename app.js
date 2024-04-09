import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import multer from 'multer';
import request from 'request';
import axios from 'axios';
import OpenAI from 'openai';

import functionjs from "./functionjs/index.js";
import fs from 'fs';
import path from 'path';


async function queryAssistant(assistantId, userQuery) {
  
}

// async function readJsonFile (filedata) {
//     try {
//         const filePath = path.join('data', filedata);
//         const data = await fs.readFile(filePath, 'utf8');
//         const jsonData = JSON.parse(data);
//         return jsonData;
//     } catch (err) {
//         console.error('Error reading the file:', err);
//     }
// }


import cors from 'cors';

import { initializeApp } from "firebase/app";
const firebaseConfig = {
  apiKey: "AIzaSyBKU0BuRrLaVudLHwPjlMpVHkK5tW645Yo",
  authDomain: "alfred-line-webhook-api.firebaseapp.com",
  projectId: "alfred-line-webhook-api",
  storageBucket: "alfred-line-webhook-api.appspot.com",
  messagingSenderId: "586062678452",
  appId: "1:586062678452:web:5aa9ba7ae0ae18bd770ae1"
};
const firebaseapp = initializeApp(firebaseConfig);
//require('dotenv').config();

//import api from './api/index.js';
import { getStorage, ref, uploadBytes, getDownloadURL, uploadBytesResumable, uploadString } from "firebase/storage";
import { 
          getDoc,
          getDocs,
          where,
          orderBy,
          doc,
          query,
          updateDoc,
          setDoc,
          addDoc,
          increment,
          getFirestore,
          collection,
          runTransaction,
          serverTimestamp,
} from "firebase/firestore";

const storage = getStorage();
const dbstore = getFirestore();
const app = express();


app.use(morgan('dev'));
app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({message: 'test'});
});

app.post('/forcemessage/line/webhook/:forcompany/:recordid', async (req, res) => {
  let thisparam = req.params.forcompany
  let recordid = req.params.recordid
  const docRef = doc(dbstore, "message_line_"+thisparam, recordid)
  const docSnap = await getDoc(docRef);
  let thisuserdata = await docSnap.data()
  thisuserdata.id = recordid
  let thisforcompany = await functionjs.getForcompany(thisparam)
  let thisstokenres = await functionjs.getTokenlark(thisforcompany)
  await functionjs.send_message_by_userid(thisstokenres, thisforcompany, thisuserdata.user_id, thisuserdata)
  await res.status(200).send('ok')
});


app.get('/mockuproom/:forcompany/:roomid', async (req, res) => {
  let thisroomid = req.params.roomid
  let thisparam = req.params.forcompany
  let thisforcompany = await functionjs.getForcompany(thisparam)
  let thisstokenres = await functionjs.getTokenlark(thisforcompany)
  let thisstoken = await thisstokenres
  let data2return = await axios.request({
    headers: {
      Authorization: 'Bearer '+thisstoken,
      'Content-Type': 'application/json',
    },
    method: "DELETE",
    data: {
      "id_list": [ "d9cdg11a","6dae7g89","7fbdbba2","22d2d869","64b6ffa4","bf6a1c16","19ed8f51","8317b15e","faa997a2","9gdc9a6c","54eg842f","b5459dc6","db2dgba3","gb5f4833","b4gfa3d5","c8252377","f5b74daa","6dbg4e65","fd8gef52","85612fc1","46398ccb","e7g76dg8" ]
    },
    url: "https://open.larksuite.com/open-apis/im/v1/chats/oc_2c20c7a8fc2414af4c7923edd7083c9b/members?member_id_type=user_id"
  })
  await res.status(200).send(thisstoken)
});

app.post('/lark-sendpdf', async (req, res) => {
  let requestbody = req.body
  console.log(JSON.stringify(requestbody))
  console.log(requestbody)
  console.log(requestbody.linetoken)
  console.log("JSON.stringify(req.body)final")
  await axios.post('https://api.line.me/v2/bot/message/push', {
    "to": requestbody.userId,
    "messages": [
      {
        "type": "flex",
        "altText": "You have received a PDF file.",
        "contents": {
          "type": "bubble",
          "body": {
            "type": "box",
            "layout": "horizontal",
            "contents": [
              {
                "type": "button",
                "style": "primary",
                "action": {
                  "type": "uri",
                  "label": "VIEW PDF FILE",
                  "uri": requestbody.imageurl,
                }
              }
            ]
          }
        }
      }
    ]
  }, {
    headers: {
      'Authorization': 'Bearer '+requestbody.linetoken,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  })
  await functionjs.set_message_status(requestbody.datamessagekey, { 'name': requestbody.forcompany }, 'sent')
  await res.status(200).send('ok')
})

app.post('/line/webhook/:forcompany', async (req, res) => {
  let resuser,thisforcompany,thisstokenres
  let thisparam = req.params.forcompany
  let requestbody = req.body
  console.log(JSON.stringify(req.body))
  let allmessage = requestbody['events']
  let userId = allmessage[0]['source']['userId']
  let thisstoken
  const docRef = doc(dbstore, "userline_"+thisparam, userId)
  const docSnap = await getDoc(docRef);
  let thisuserdata = await docSnap.data()
  await allmessage.forEach((currentElement, index) => {
    if (currentElement.message.type == 'text' || currentElement.message.type == 'sticker' || currentElement.message.type == 'audio' || currentElement.message.type == 'video' || currentElement.message.type == 'image') {
      addDoc(collection(dbstore, "message_line_"+thisparam), {
        init_timestamp: currentElement.timestamp,
        user_id: userId,
        message_data: currentElement,
        status: "wait",
        forcompany: thisparam,
        timestamp: serverTimestamp(),
        created_at: Date.now()
      });
    } else {
      addDoc(collection(dbstore, "message_line_error_"+thisparam), {
        init_timestamp: currentElement.timestamp,
        user_id: userId,
        message_data: currentElement,
        status: "wait",
        forcompany: thisparam,
        timestamp: serverTimestamp(),
        created_at: Date.now()
      });
    }
  })
  if (docSnap.exists()) {
    
    if (thisuserdata.larkchatid == "pre") {
      await res.status(200).send('ok')
    } else {
      resuser = await functionjs.get_userline_data(thisforcompany, userId, thisstoken)
      thisforcompany = await functionjs.getForcompany(thisparam)
      thisstokenres = await functionjs.getTokenlark(thisforcompany)
      thisstoken = thisstokenres
      await functionjs.query_message_by_user(thisstoken, thisforcompany , userId)
      await res.status(200).send('ok')
    }
  } else {
    await setDoc(doc(dbstore, "userline_"+thisparam, userId), {
      forcompany: thisparam,
      timestamp: serverTimestamp(),
      displayname: "pre",
      larkchatid: "pre",
      pictureurl: "pre",
      user_id: userId
    });
    thisforcompany = await functionjs.getForcompany(thisparam)
    thisstokenres = await functionjs.getTokenlark(thisforcompany)
    thisstoken = thisstokenres
    let responsecreate = await functionjs.create_userline(thisforcompany, userId, thisstoken)
    console.log(responsecreate)
    let responsequery = await functionjs.query_message_by_user(thisstoken, thisforcompany , userId)
    console.log(responsequery)
    await res.status(200).send('ok')
  }
})

app.post('/lark/webhook/:forcompany', async (req, res) => {
  let thisforcompany,thisstokenres
  let thisparam = req.params.forcompany
  let requestbody = req.body
  thisforcompany = await functionjs.getForcompany(thisparam)
  console.log(JSON.stringify(req.body))
  console.log(req.body)
  if (requestbody.type == "url_verification") {
    console.log({ "challenge": requestbody.challenge })
    await res.status(200).send({ "challenge": requestbody.challenge })
  } else {
    let messageraw = requestbody['event']
    let thislarkchatid = messageraw.message.chat_id
    let resuser = await functionjs.get_userline_data_larkchat(thisforcompany, thislarkchatid)
    await addDoc(collection(dbstore, "message_lark_"+thisparam), {
      init_timestamp: requestbody['event'].message.create_time,
      user_id: resuser.user_id,
      message_data: messageraw.message,
      status: "wait",
      forcompany: thisparam,
      timestamp: serverTimestamp(),
      created_at: Date.now()
    });
    let thisstoken = await functionjs.getTokenlark(thisforcompany)
    let querymess = await functionjs.query_message_by_larkchat(thisstoken, thisforcompany, resuser)
    await res.status(200).send("ok")
  }
})

app.post('/lark/groupchat/:forcompany', async (req, res) => {
  let thisforcompany,thisstokenres
  let thisparam = req.params.forcompany
  thisforcompany = await functionjs.getForcompany(thisparam)
  thisstokenres = await functionjs.getTokenlark(thisforcompany)
  axios.request({
    headers: {
      Authorization: `Bearer ${thisstokenres}`,
      'Content-Type': "application/json; charset=utf-8",
    },
    method: "DELETE",
    url: 'https://open.larksuite.com/open-apis/im/v1/chats/oc_c356a428a47424c9a3a4de63cbba4697/members?member_id_type=user_id',
    data: {"id_list": ["d9cdg11a","6dae7g89","7fbdbba2","22d2d869","64b6ffa4","bf6a1c16","19ed8f51","8317b15e","faa997a2","9gdc9a6c","54eg842f","b5459dc6","db2dgba3","gb5f4833","b4gfa3d5","c8252377","f5b74daa","6dbg4e65","fd8gef52","85612fc1","46398ccb","e7g76dg8"]}
  })
  await res.status(200).send("ok")
})


app.post('/line-checkdata/:forcompany', async (req, res) => {
  let thisparam = req.params.forcompany
  let thisforcompany = await axios.get('https://larkapi.soidea.co/getforcompany/'+thisparam);
  let thisstokenres  = await axios.post('https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal', {
    'app_id': thisforcompany.data.lark_app_api,
    'app_secret': thisforcompany.data.lark_app_secret
  }, {
    headers: { 'Content-type': 'application/json; charset=utf-8' }
  })
  let thisstoken = thisstokenres.data.tenant_access_token
  let dataref = await collection(dbstore, "message_line_"+thisparam)
  const q = query(dataref, where("status", "==", "wait"));
  const querySnapshot = await getDocs(q);
  let messagejson = [];
  await querySnapshot.forEach((doc) => {
    send_message_by_webhook(thisstoken, thisforcompany.data, doc.data())
  });
  res.status(200).send('ok')
})


async function getjsondataadd() {
  let jsondata1 = await readJsonFile('kwc.json');
  return jsondata1
}

app.post('/line/chatgpt/:forcompany', async (req, res) => {

  let resuser,thisforcompany,thisstokenres,datareturn
  let thisparam = req.params.forcompany
  let requestbody = req.body
  thisforcompany = await functionjs.getForcompany(thisparam)
  let thisaitoken = thisforcompany.thisaitoken
  console.log(JSON.stringify(requestbody))

  const configuration = {
    apiKey: thisaitoken,
    organization: 'org-IqzxlMpDHEs7QoKH634Hg1Ba'
  };
  const openai = new OpenAI(configuration);

    

  if (requestbody['events']) {
    let allmessage = requestbody['events']
    let userId = allmessage[0]['source']['userId']


    const dataai = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          "role": "user", 
          "content": " " + allmessage[0]['message']['text'] + "please answer this question As an information center staff with a woman persona, I provide concise and definitive answers about Iconsiam and Siam Paragon, focusing on store locations, dining options, and promotions without using uncertain language."
        }
      ],
      max_tokens: 7,
      temperature: 0,
    });

    console.log(dataai)
    console.log(dataai.choices[0].message.content)
    await addDoc(collection(dbstore, "message_lark_"+thisparam), {
      user_id: userId,
      message_data: dataai.choices[0].message.content,
      status: "wait",
      forcompany: thisparam,
      timestamp: serverTimestamp(),
      created_at: Date.now()
    });
    let thisforcompany = await functionjs.getForcompany(thisparam)
    let thisstoken = await functionjs.getTokenlark(thisforcompany)
    resuser = await functionjs.get_userline_data(thisforcompany, userId, thisstoken)
    let dataref = collection(dbstore, "message_lark_"+thisforcompany.name)
    const q = query(dataref, where("status", "==", "wait"), where("user_id", "==", userId) );
    const querySnapshot = await getDocs(q);
    let newdatajson = []
    await querySnapshot.forEach(async (doc) => {
      let bodydata = doc.data()
      bodydata.id = doc.id
      newdatajson.push(bodydata)
    });
    let datasendtext
    let datareturn
    await newdatajson.forEach(async (element) => {
      console.log(element.id)
      await functionjs.set_larkmessage_status(element.id, thisforcompany, 'sent')
      datareturn = await axios.post('https://api.line.me/v2/bot/message/push', {
        "to": userId,
        "messages": [
          {
            "type": 'text',
            "text": dataai.choices[0].message.content
          }
        ]
      }, {
        headers: {
          'Authorization': 'Bearer '+thisforcompany.linetoken,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })
    });
  }
  res.status(200).send('ok')
})


app.post('/upload_firebase', multer({limits: { fieldSize: 30 * 1024 * 1024 }}).single('file') , async (req, res) => {
  console.log(req.filedata)
  console.log("req.file end")
  let file = req.body.filedata
  const metadata = {
    contentType: 'image/jpeg'
  };
  const storageRef = await ref(storage, 'images/' + functionjs.makeid(30) + "-image");

  const uploadTask = uploadBytes(storageRef, file).then((snapshot) => {
    //console.log(snapshot)
  });
  // uploadTask.on('state_changed', (snapshot) => {
  //     console.log(snapshot)
  //     const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
  //     console.log('Upload is ' + progress + '% done');
  //     switch (snapshot.state) {
  //       case 'paused':
  //         console.log('Upload is paused');
  //         break;
  //       case 'running':
  //         console.log('Upload is running');
  //         break;
  //     }
  //   }, 
  //   (error) => {
  //     switch (error.code) {
  //       case 'storage/unauthorized':
  //         break;
  //       case 'storage/canceled':
  //         break;
  //       case 'storage/unknown':
  //         break;
  //     }
  //   }, () => {
  //     getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
  //       res.status(200).send(downloadURL)
  //     });
  //   }
  // );
})

const port = process.env.PORT || 8000;

app.listen(port, () => {
  console.log(`Listening: http://localhost:${port}`);
});

app.post('/upload_firebase_data', multer({
    limits: { fieldSize: 30 * 1024 * 1024 }
  }).single('file') , async (req, res) => {
  console.log("req.file")
  console.log(req.body)
  console.log("req.file end")
  let file = req.file
  const metadata = {
    contentType: 'image/jpeg'
  };
  const storageRef = await ref(storage, 'images/' + functionjs.makeid(30) + "-image");
  const uploadTask = uploadBytesResumable(storageRef, file, metadata);
  uploadTask.on('state_changed', (snapshot) => {
      console.log(snapshot)
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      console.log('Upload is ' + progress + '% done');
      switch (snapshot.state) {
        case 'paused':
          console.log('Upload is paused');
          break;
        case 'running':
          console.log('Upload is running');
          break;
      }
    }, 
    (error) => {
      switch (error.code) {
        case 'storage/unauthorized':
          break;
        case 'storage/canceled':
          break;
        case 'storage/unknown':
          break;
      }
    }, () => {
      getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
        res.status(200).send(downloadURL)
      });
    }
  );

});

export default  app;
