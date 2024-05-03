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
const chatGpt = (app) => {
  app.post('/line/chatgpt/:forcompany', async (req, res) => {
    let resuser,thisforcompany,thisstokenres
    let thisparam = req.params.forcompany
    let requestbody = req.body
    console.log(JSON.stringify(req.body))
    let allmessage = requestbody['events']
    let userId = allmessage[0]['source']['userId']
    let thisstoken
    let docRef = doc(dbstore, "userline_"+thisparam, userId)
    let docSnap = await getDoc(docRef);
    let thisuserdata = await docSnap.data()
    await allmessage.forEach((currentElement, index) => {
      if (currentElement.message.type == 'text' || currentElement.message.type == 'sticker' || currentElement.message.type == 'audio' || currentElement.message.type == 'video' || currentElement.message.type == 'image' || currentElement.message.type == 'location' ) {
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
      let responsecreate = await functionjs.create_userline_gpt(thisforcompany, userId, thisstoken)
      thisuserdata = responsecreate
    }

    let thisaitoken = thisforcompany.thisaitoken
    let thisassistant_id = thisforcompany.assistant_id

    const configuration = {
      apiKey: thisaitoken,
      organization: 'org-IqzxlMpDHEs7QoKH634Hg1Ba'
    };
    const openai = new OpenAI(configuration);

    let dataref = collection(dbstore, "message_line_"+thisforcompany.name)
    const q = query(dataref, where("status", "==", "wait"), where("user_id", "==", userId) );
    const querySnapshot = await getDocs(q);
    let newdatajson = []
    await querySnapshot.forEach(async (doc) => {
      let bodydata = doc.data()
      bodydata.id = doc.id
      newdatajson.push(bodydata)
    });
    let thisforcompany2 = await functionjs.getForcompany(thisparam+'_gpt')
    let thisstokenres2 = await functionjs.getTokenlark(thisforcompany2)


    await newdatajson.forEach(async (element) => {
      await functionjs.send_message_by_userid(thisstoken, thisforcompany, userId, element)
      const dataai = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            "role": "user", 
            "content": "Please ac like iconsiam woman staff and answer the question in simple and summarize language and do not answer more than 200 characters. Question:" + element.message_data.message.text
          }
        ]
      });

      let datasendtext = dataai.choices[0].message.content
      let datareturn = await axios.post('https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id', {
        "receive_id": thisuserdata.larkchatid,
        "msg_type": "text",
        "content": JSON.stringify({ "text": datasendtext })
      }, {
        headers: {
          'Authorization': 'Bearer '+thisstokenres2,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })

      await axios.post('https://api.line.me/v2/bot/message/push', {
        "to": userId,
        "messages": [
          {
            "type": "text",
            "text": datasendtext
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

    const thisThread = await openai.beta.threads.createAndRun({
      assistant_id: thisassistant_id,
      thread: {
        messages: [
          { role: "user", content: "Explain deep learning to a 5 year old." },
        ],
      },
    })

    console.log(thisThread);
    const run = await openai.beta.threads.runs.retrieve(
      thisThread.thread_id,
      thisThread.id
    );

    console.log(run);
    await res.status(200).send('ok')
  })

  app.post('/lark/chatgpt-bot/:forcompany', async (req, res) => {
    let thisparam = req.params.forcompany
    let requestbody = req.body
    let thisforcompany = await functionjs.getForcompany(thisparam)
    let thisaitoken = thisforcompany.thisaitoken
    const configuration = {
      apiKey: thisaitoken,
      organization: 'org-IqzxlMpDHEs7QoKH634Hg1Ba'
    };
    const openai = new OpenAI(configuration);
    //console.log("open ai")
    console.log(JSON.stringify(requestbody))
    if (requestbody.type == "url_verification") {
      await res.status(200).send({ "challenge": requestbody.challenge })
    } else {
      let thisstokenres = await functionjs.getTokenlark(thisforcompany)
      let thischat_id = requestbody['event']['message']['chat_id']
      let thistextget = requestbody['event']['message']['content']
      thistextget = JSON.parse(thistextget)
      //console.log(chat_id)
      const dataai = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            "role": "user", 
            "content": "Please ac like iconsiam woman staff and answer the question in simple and summarize language and do not answer more than 200 characters. Question:" + thistextget['text']
          }
        ]
      });
      console.log(dataai.choices[0].message.content)
      let datasendtext = dataai.choices[0].message.content
      let datareturn = await axios.post('https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id', {
        "receive_id": thischat_id,
        "msg_type": "text",
        "content": JSON.stringify({ "text": datasendtext })
      }, {
        headers: {
          'Authorization': 'Bearer '+thisstokenres,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })
      await res.status(200).send('ok')
    }
  })
};

export { chatGpt };