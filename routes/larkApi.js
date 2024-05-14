import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import multer from 'multer';
import request from 'request';
import axios from 'axios';

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

import functionjs from "../functionjs/index.js";

const larkApi = (app) => {

  app.post('/lark/webhook/:forcompany', async (req, res) => {
    let thisforcompany,thisstokenres
    let thisparam = req.params.forcompany
    let requestbody = req.body
    thisforcompany = await functionjs.getForcompany(thisparam)
    console.log(JSON.stringify(req.body))
    console.log(req.body)
    console.log("req.body")
    if (requestbody.type == "url_verification") {
      console.log({ "challenge": requestbody.challenge })
      await res.status(200).send({ "challenge": requestbody.challenge })
    } else {
      let messageraw = requestbody['event']
      let thislarkchatid = messageraw.message.chat_id
      let resuser = await functionjs.get_userline_data_larkchat(thisforcompany, thislarkchatid)
      if (messageraw.message.message_type == 'text' || messageraw.message.message_type == 'post' || messageraw.message.message_type == 'image' || messageraw.message.message_type == 'media'|| messageraw.message.message_type == 'file') {
        if (messageraw.message.message_type == 'text' && JSON.parse(messageraw.message.content).text.includes('@_')) {
          // await addDoc(collection(dbstore, "message_lark_"+thisparam), {
          //   init_timestamp: requestbody['event'].message.create_time,
          //   user_id: resuser.user_id,
          //   message_data: messageraw.message,
          //   status: "stop",
          //   forcompany: thisparam,
          //   timestamp: serverTimestamp(),
          //   created_at: Date.now()
          // });
        } else {
            let innercheck = false
            if (messageraw.message.status == "tester") {
              innercheck = false
            } else {
              let dataref2 = collection(dbstore, "message_lark_"+thisparam)
              const q2 = query(dataref2, where("message_id", "==", messageraw.message.message_id));
              const querySnapshot2 = await getDocs(q2);
              await querySnapshot2.forEach(async (doc) => {
                innercheck = true
              });
            }
            console.log(innercheck)
            if (innercheck == false) {
              console.log("req.body2")
              await addDoc(collection(dbstore, "message_lark_"+thisparam), {
                init_timestamp: requestbody['event'].message.create_time,
                user_id: resuser.user_id,
                message_data: messageraw.message,
                message_id: messageraw.message.message_id,
                status: "wait",
                forcompany: thisparam,
                timestamp: serverTimestamp(),
                created_at: Date.now()
              });
            }
        }
        let thisstoken = await functionjs.getTokenlark(thisforcompany)
        let querymess = await functionjs.query_message_by_larkchat(thisstoken, thisforcompany, resuser)
      }
      await res.status(200).send("ok")
    }
  })

  app.post('/lark/webhook/groupchat/:forcompany', async (req, res) => {
    let thisforcompany,thisstokenres
    let thisparam = req.params.forcompany
    let requestbody = req.body
    let resuser
    thisforcompany = await functionjs.getForcompany(thisparam)
    console.log(JSON.stringify(req.body))
    console.log(req.body)
    console.log("req.body")
    if (requestbody.type == "url_verification") {
      console.log({ "challenge": requestbody.challenge })
      await res.status(200).send({ "challenge": requestbody.challenge })
    } else {
      let messageraw = requestbody['event']
      let thislarkchatid = messageraw.message.chat_id
      //let resuser = await functionjs.get_userline_data_larkchat(thisforcompany, thislarkchatid)
      const quser = query(collection(dbstore, "usergroupline_"+thisforcompany.name), where("larkchatid", "==", larkchatid));
      resuser = await getDocs(q);
      querySnapshot.forEach((doc) => { userdata = doc.data() });
      if (messageraw.message.message_type == 'text' || messageraw.message.message_type == 'post' || messageraw.message.message_type == 'image' || messageraw.message.message_type == 'media'|| messageraw.message.message_type == 'file') {
        if (messageraw.message.message_type == 'text' && JSON.parse(messageraw.message.content).text.includes('@_')) {
          // await addDoc(collection(dbstore, "message_lark_"+thisparam), {
          //   init_timestamp: requestbody['event'].message.create_time,
          //   user_id: resuser.user_id,
          //   message_data: messageraw.message,
          //   status: "stop",
          //   forcompany: thisparam,
          //   timestamp: serverTimestamp(),
          //   created_at: Date.now()
          // });
        } else {
            let innercheck = false
            if (messageraw.message.status == "tester") {
              innercheck = false
            } else {
              let dataref2 = collection(dbstore, "message_grouplark_"+thisparam)
              const q2 = query(dataref2, where("message_id", "==", messageraw.message.message_id));
              const querySnapshot2 = await getDocs(q2);
              await querySnapshot2.forEach(async (doc) => {
                innercheck = true
              });
            }
            console.log(innercheck)
            if (innercheck == false) {
              console.log("req.body2")
              await addDoc(collection(dbstore, "message_grouplark_"+thisparam), {
                init_timestamp: requestbody['event'].message.create_time,
                groupId: resuser.groupId,
                message_data: messageraw.message,
                message_id: messageraw.message.message_id,
                status: "wait",
                forcompany: thisparam,
                timestamp: serverTimestamp(),
                created_at: Date.now()
              });
            }
        }
        let thisstoken = await functionjs.getTokenlark(thisforcompany)
        //let querymess = await functionjs.query_message_by_larkchat(thisstoken, thisforcompany, resuser)
        let dataref = collection(dbstore, "message_grouplark_"+thisforcompany.name)
        const q = query(dataref, where("status", "==", "wait"), where("groupId", "==", resuser.groupId) );
        const querySnapshot = await getDocs(q);
        let newdatajson = []
        await querySnapshot.forEach(async (doc) => {
          let bodydata = doc.data()
          bodydata.id = doc.id
          newdatajson.push(bodydata)
        });
        await newdatajson.forEach(async (element) => {
          await functionjs.send_message_from_grouplark(thisstoken, thisforcompany, resuser.groupId, element)
        });
      }
      await res.status(200).send("ok")
    }
  })

  // app.post('/lark/groupchat/:forcompany', async (req, res) => {
  //   let thisforcompany,thisstokenres
  //   let thisparam = req.params.forcompany
  //   thisforcompany = await functionjs.getForcompany(thisparam)
  //   thisstokenres = await functionjs.getTokenlark(thisforcompany)
  //   axios.request({
  //     headers: {
  //       Authorization: `Bearer ${thisstokenres}`,
  //       'Content-Type': "application/json; charset=utf-8",
  //     },
  //     method: "DELETE",
  //     url: 'https://open.larksuite.com/open-apis/im/v1/chats/oc_c356a428a47424c9a3a4de63cbba4697/members?member_id_type=user_id',
  //     data: {"id_list": ["d9cdg11a","6dae7g89","7fbdbba2","22d2d869","64b6ffa4","bf6a1c16","19ed8f51","8317b15e","faa997a2","9gdc9a6c","54eg842f","b5459dc6","db2dgba3","gb5f4833","b4gfa3d5","c8252377","f5b74daa","6dbg4e65","fd8gef52","85612fc1","46398ccb","e7g76dg8"]}
  //   })
  //   await res.status(200).send("ok")
  // })

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

  app.get('/larktoken/:forcompany', async (req, res) => {
    let thisparam = req.params.forcompany
    let thisforcompany = await functionjs.getForcompany(thisparam)
    let thisstokenres = await functionjs.getTokenlark(thisforcompany)
    await res.status(200).send(thisstokenres)
  })

};

export { larkApi };