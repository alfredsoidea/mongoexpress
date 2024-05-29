import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import multer from 'multer';
import request from 'request';
import axios from 'axios';
import OpenAI from 'openai';
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

const lineApi = (app) => {

    app.post('/line/webhook/:forcompany', async (req, res) => {
      let resuser,thisforcompany,thisstokenres
      let thisparam = req.params.forcompany
      let requestbody = req.body
      console.log(thisparam)
      console.log(requestbody)
      console.log(JSON.stringify(req.body))
      let allmessage = requestbody['events']
      let userId = allmessage[0]['source']['userId']
      let thisstoken
      const docRef = doc(dbstore, "userline_"+thisparam, userId)
      const docSnap = await getDoc(docRef);
      let thisuserdata = await docSnap.data()
      await allmessage.forEach((currentElement, index) => {
        if (currentElement.message.type == 'file' || currentElement.message.type == 'text' || currentElement.message.type == 'sticker' || currentElement.message.type == 'audio' || currentElement.message.type == 'video' || currentElement.message.type == 'image' || currentElement.message.type == 'location' ) {
          addDoc(collection(dbstore, "message_line_"+thisparam), {
            init_timestamp: currentElement.timestamp,
            user_id: userId,
            message_data: currentElement,
            status: "wait",
            forcompany: thisparam,
            timestamp: serverTimestamp(),
            created_at: Date.now(),
            messagetype: currentElement.message.type
          });
        } else {
          addDoc(collection(dbstore, "message_line_error_"+thisparam), {
            init_timestamp: currentElement.timestamp,
            user_id: userId,
            message_data: currentElement,
            status: "wait",
            forcompany: thisparam,
            timestamp: serverTimestamp(),
            created_at: Date.now(),
            messagetype: currentElement.message.type
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

    app.post('/line/webhook/groupchat/:forcompany', async (req, res) => {
      let resuser,thisforcompany,thisstokenres
      let thisparam = req.params.forcompany
      let thisstoken
      let requestbody = req.body
      let allmessage = requestbody['events']
      let thisGroupId = allmessage[0].source.groupId
      console.log(thisparam)
      console.log(requestbody)
      console.log(JSON.stringify(req.body))
      thisforcompany = await functionjs.getForcompany(thisparam)
      thisstoken = await functionjs.getTokenlark(thisforcompany)
      console.log("allmessage.type")
      if (allmessage[0].type == "join") {
        console.log("Joined")
        const docRef = doc(dbstore, "usergroupline_"+thisparam, thisGroupId)
        const docSnap = await getDoc(docRef);
        let thisuserdata = await docSnap.data()
        if (docSnap.exists()) {
          await res.status(200).send('ok')
        } else {
          await setDoc(doc(dbstore, "usergroupline_"+thisparam, thisGroupId), {
            forcompany: thisparam,
            timestamp: serverTimestamp(),
            displayname: "pre",
            larkchatid: "pre",
            pictureurl: "pre",
            groupId: thisGroupId
          });
          let usergroupline = await functionjs.create_usergroupline(thisforcompany, thisGroupId, thisstoken)
          console.log(usergroupline)
        }
      } else if (allmessage[0].type == "leave") {

      } else if (allmessage[0].type == "message") {
        const docRef2 = doc(dbstore, "usergroupline_"+thisparam, thisGroupId)
        const docSnap2 = await getDoc(docRef2);
        let thisuserdata2 = await docSnap2.data()
        await allmessage.forEach((currentElement, index) => {
          if (currentElement.message.type == 'text' || currentElement.message.type == 'file' || currentElement.message.type == 'sticker' || currentElement.message.type == 'audio' || currentElement.message.type == 'video' || currentElement.message.type == 'image' || currentElement.message.type == 'location' ) {
            addDoc(collection(dbstore, "message_groupline_"+thisparam), {
              init_timestamp: currentElement.timestamp,
              group_id: thisGroupId,
              message_data: currentElement,
              status: "wait",
              forcompany: thisparam,
              timestamp: serverTimestamp(),
              created_at: Date.now(),
              messagetype: currentElement.message.type
            });
          } else {
            addDoc(collection(dbstore, "message_groupline_error_"+thisparam), {
              init_timestamp: currentElement.timestamp,
              group_id: thisGroupId,
              message_data: currentElement,
              status: "wait",
              forcompany: thisparam,
              timestamp: serverTimestamp(),
              created_at: Date.now(),
              messagetype: currentElement.message.type
            });
          }
        })
        let usergroupline_message = await functionjs.query_message_by_usergroup(thisstoken, thisforcompany, thisGroupId)
      }
      await res.status(200).send('ok')
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

    app.post('/line-sendpdf', async (req, res) => {
      let requestbody = req.body
      console.log(JSON.stringify(requestbody))
      console.log(requestbody)
      let datasendtext = "You have receive a PDF file : "+requestbody.imageurl
      datareturn = await axios.post('https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id', {
        "receive_id": userdata.larkchatid,
        "msg_type": "text",
        "content": JSON.stringify({ "text": datasendtext })
      }, {
        headers: {
          'Authorization': 'Bearer '+thisstoken,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })
    })

    app.get('/line-readpdf/:linkview', async (req, res) => {
      //let linkview = req.params.linkview
      //res.redirect(linkview);
    })

};

export { lineApi };