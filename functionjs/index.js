import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import multer from 'multer';
import request from 'request';
import axios from 'axios';
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
import { getStorage, ref, uploadBytes, getDownloadURL, uploadBytesResumable } from "firebase/storage";
import { 
          getDoc,
          onSnapshot,
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
          serverTimestamp
} from "firebase/firestore";

const storage = getStorage();
const dbstore = getFirestore();
const app = express();


const functionjs = {
  get_userline_data: async function (thisforcompany, userId) {
    const docRef = await doc(dbstore, "userline_"+thisforcompany, userId)
    const docSnap = await getDoc(docRef);
    let thisuserdata = await docSnap.data()
    return thisuserdata
  },
  get_userline_data_gpt: async function (thisforcompany, userId) {
    const docRef = await doc(dbstore, "userline_"+thisforcompany, userId)
    const docSnap = await getDoc(docRef);
    let thisuserdata = await docSnap.data()
    return thisuserdata
  },
  get_userline_data_larkchat: async function (thisforcompany, larkchatid) {
    const q = query(collection(dbstore, "userline_"+thisforcompany.name), where("larkchatid", "==", larkchatid));
    const querySnapshot = await getDocs(q);
    let userdata = ""
    querySnapshot.forEach((doc) => { userdata = doc.data() });
    return userdata
  },
  create_larkchat_gpt: async function (thisforcompany, displayName, imagekey, thisstoken, userId) {
    let thisdata = []
    let getUserinitAdmin = await axios.get("https://larkapi.soidea.co/getuserinit/"+thisforcompany.name)
    await getUserinitAdmin.data.forEach((element) => {
      thisdata.push(element.userlark_id)
    });
    console.log("thisdata")
    let response = await axios.post('https://open.larksuite.com/open-apis/im/v1/chats?user_id_type=user_id', {
      "name": displayName,
      "avatar": imagekey,
      "bot_id_list": [ thisforcompany.lark_app_api, thisforcompany.openai_app_id ],
      "user_id_list": thisdata
    }, {
      headers: {
        'Authorization': 'Bearer ' + thisstoken,
        'Content-Type': 'application/json; charset=utf-8"' 
      }
    })
    console.log("responsenow")
    console.log(response)
    return response.data.data.chat_id;
  },
  create_larkchat: async function (thisforcompany, displayName, imagekey, thisstoken, userId) {
    let thisdata = []
    let getUserinitAdmin = await axios.get("https://larkapi.soidea.co/getuserinit/"+thisforcompany.name)
    console.log("getUserinitAdmin")
    await getUserinitAdmin.data.forEach((element) => {
      if (userId == 'U19676ac8b7cbd97b66e4c6b3d917f049') {
        if (element.email == 'alfred@soidea.co' || element.email == 'chate@soidea.co') {
          thisdata.push(element.userlark_id)  
        }
      } else {
        thisdata.push(element.userlark_id)
      }
    });
    console.log("thisdata")
    console.log(thisdata)
    
    console.log(JSON.stringify(thisdata))
    let response = await axios.post('https://open.larksuite.com/open-apis/im/v1/chats?user_id_type=user_id', {
      "name": displayName,
      "avatar": imagekey,
      "bot_id_list": [ thisforcompany.lark_app_api ],
      "user_id_list": thisdata
    }, {
      headers: {
        'Authorization': 'Bearer ' + thisstoken,
        'Content-Type': 'application/json; charset=utf-8"' 
      }
    })
    console.log("responsenow")
    console.log(response)
    return response.data.data.chat_id;
  },
  upload_avatar_lark: async function (imagefileurl, thisstoken) {
    console.log("dataresult_avatar1")
    let dataresult_avatar = await axios({ 
      method: 'get', 
      responseType: 'arraybuffer',
      url: imagefileurl
    })
    console.log("dataresult_avatar")
    let response = await axios.post('https://open.larksuite.com/open-apis/im/v1/images', {
      "image_type": "avatar",
      "image": dataresult_avatar.data
    }, {
      headers: {
        'Authorization': 'Bearer '+thisstoken,
        'Content-Type': 'multipart/form-data' 
      }
    })
    console.log("responselark")
    return response
  },
  check_messagestatus: async function(thisforcompany, userId) {
  },
  create_userline_gpt: async function(thisforcompany, userId, thisstoken) {
    let lark_app_api = thisforcompany.lark_app_api
    let lark_app_secret = thisforcompany.lark_app_secret
    let linetoken = thisforcompany.linetoken
    let userfromline = await functionjs.get_user_from_line(userId, linetoken)
    let userDisplayname, userDisplayImage, avatarData, avatarKey, newlarkchatid, newUserdata
    console.log(userfromline)

    if (userfromline.displayName) {
      userDisplayname = await userfromline.displayName
    } else {
      userDisplayname = ""
    }

    if (userfromline.pictureUrl) {
      userDisplayImage = await userfromline.pictureUrl
    } else {
      userDisplayImage = "none"
    }

    const userDocRef = doc(dbstore, "userline_"+thisforcompany.name, userId);
    await runTransaction(dbstore, async (transaction) => {
      await transaction.update(userDocRef, { 
        displayname: userDisplayname,
        pictureurl: userDisplayImage
      });
    });

    if (userDisplayImage == "none") {
      newlarkchatid = await functionjs.create_larkchat_gpt(thisforcompany, userDisplayname , "none", thisstoken, userId)
      newUserdata = await runTransaction(dbstore, async (transaction) => {
        await transaction.update(userDocRef, { 
          larkchatid: newlarkchatid
        })
      })
    } else {
      avatarData = await functionjs.upload_avatar_lark(userfromline.pictureUrl , thisstoken)
      avatarKey = await avatarData.data.data.image_key
      newlarkchatid = await functionjs.create_larkchat_gpt(thisforcompany, userDisplayname , avatarKey, thisstoken, userId)
      newUserdata = await runTransaction(dbstore, async (transaction) => {
        await transaction.update(userDocRef, { 
          larkchatid: newlarkchatid
        })
      })
    }

    let docRef = await doc(dbstore, "userline_"+thisforcompany.name, userId)
    let docSnap = await getDoc(docRef);
    let thisuserdata = await docSnap.data()
    
    return thisuserdata
  },
  create_userline: async function(thisforcompany, userId, thisstoken) {
    console.log("functionjscreate_userline")
    let lark_app_api = thisforcompany.lark_app_api
    let lark_app_secret = thisforcompany.lark_app_secret
    let linetoken = thisforcompany.linetoken
    let userfromline = await functionjs.get_user_from_line(userId, linetoken)
    let userDisplayname, userDisplayImage, avatarData, avatarKey, newlarkchatid, newUserdata
    console.log(userfromline)

    if (userfromline.displayName) {
      userDisplayname = await userfromline.displayName
    } else {
      userDisplayname = ""
    }

    if (userfromline.pictureUrl) {
      userDisplayImage = await userfromline.pictureUrl
    } else {
      userDisplayImage = "none"
    }

    const userDocRef = doc(dbstore, "userline_"+thisforcompany.name, userId);
    await runTransaction(dbstore, async (transaction) => {
      await transaction.update(userDocRef, { 
        displayname: userDisplayname,
        pictureurl: userDisplayImage
      });
    });

    if (userDisplayImage == "none") {
      newlarkchatid = await functionjs.create_larkchat(thisforcompany, userDisplayname , "none", thisstoken, userId)
      newUserdata = await runTransaction(dbstore, async (transaction) => {
        await transaction.update(userDocRef, { 
          larkchatid: newlarkchatid
        })
      })
    } else {
      avatarData = await functionjs.upload_avatar_lark(userfromline.pictureUrl , thisstoken)
      avatarKey = await avatarData.data.data.image_key
      newlarkchatid = await functionjs.create_larkchat(thisforcompany, userDisplayname , avatarKey, thisstoken, userId)
      newUserdata = await runTransaction(dbstore, async (transaction) => {
        await transaction.update(userDocRef, { 
          larkchatid: newlarkchatid
        })
      })
    }
    
    return newlarkchatid
  },
  create_usergroupline: async function(thisforcompany, groupId, thisstoken, chattype) {
    let userDisplayname, userDisplayImage, avatarData, avatarKey, newlarkchatid, newUserdata
    console.log("functionjscreate_userline")
    let lark_app_api = thisforcompany.lark_app_api
    let lark_app_secret = thisforcompany.lark_app_secret
    let linetoken = thisforcompany.linetoken
    console.log(chattype)
    let getUser, getGroup
    let toSetId = ''

    if (chattype == 'group') {
      getGroup = await axios.request({
        headers: {
          Authorization: 'Bearer '+linetoken,
          'Content-Type': 'application/json; charset=utf-8',
        },
        method: "GET",
        url: 'https://api.line.me/v2/bot/group/'+groupId+'/summary'
      })
      getGroup = getGroup.data
      toSetId = getGroup.groupId
      console.log("getGroup")
      if (getGroup.groupName) {
        userDisplayname = await getGroup.groupName
      } else {
        userDisplayname = ""
      }
  
      if (getGroup.pictureUrl) {
        userDisplayImage = await getGroup.pictureUrl
      } else {
        userDisplayImage = "none"
      }
    }

    if (chattype == 'user') {
      getUser = await functionjs.get_user_from_line(groupId, linetoken)
      console.log("await getUser")
      console.log(await getUser)
      toSetId = getUser.userId
      if (getUser.displayName) {
        userDisplayname = await getUser.displayName
      } else {
        userDisplayname = ""
      }
  
      if (getUser.pictureUrl) {
        userDisplayImage = await getUser.pictureUrl
      } else {
        userDisplayImage = "none"
      }
    }


    const userDocRef = doc(dbstore, "usergroupline_"+thisforcompany.name, toSetId);

    if (chattype == 'user') {
      await runTransaction(dbstore, async (transaction) => {
        await transaction.update(userDocRef, { 
          displayname: userDisplayname,
          pictureurl: userDisplayImage
        });
      });
  
      if (userDisplayImage == "none") {
        newlarkchatid = await functionjs.create_larkchat(thisforcompany, userDisplayname , "none", thisstoken, groupId)
        newUserdata = await runTransaction(dbstore, async (transaction) => {
          await transaction.update(userDocRef, { 
            larkchatid: newlarkchatid
          })
        })
      } else {
        avatarData = await functionjs.upload_avatar_lark(getUser.pictureUrl , thisstoken)
        avatarKey = await avatarData.data.data.image_key
        newlarkchatid = await functionjs.create_larkchat(thisforcompany, userDisplayname , avatarKey, thisstoken, groupId)
        newUserdata = await runTransaction(dbstore, async (transaction) => {
          await transaction.update(userDocRef, { 
            larkchatid: newlarkchatid
          })
        })
      }
    } else {
      await runTransaction(dbstore, async (transaction) => {
        await transaction.update(userDocRef, { 
          displayname: userDisplayname,
          pictureurl: userDisplayImage
        });
      });
  
      if (userDisplayImage == "none") {
        newlarkchatid = await functionjs.create_larkchat(thisforcompany, userDisplayname , "none", thisstoken, groupId)
        newUserdata = await runTransaction(dbstore, async (transaction) => {
          await transaction.update(userDocRef, { 
            larkchatid: newlarkchatid
          })
        })
      } else {
        avatarData = await functionjs.upload_avatar_lark(getGroup.pictureUrl , thisstoken)
        avatarKey = await avatarData.data.data.image_key
        newlarkchatid = await functionjs.create_larkchat(thisforcompany, userDisplayname , avatarKey, thisstoken, groupId)
        newUserdata = await runTransaction(dbstore, async (transaction) => {
          await transaction.update(userDocRef, { 
            larkchatid: newlarkchatid
          })
        })
      }
    }
    
    
    return newlarkchatid
  },
  get_user_from_line: async function (userId, linetoken) {
    console.log("geting linedata from " + userId)
    let response = await axios.request({
      headers: {
        Authorization: `Bearer ${linetoken}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      method: "GET",
      url: 'https://api.line.me/v2/bot/profile/' + userId
    })
    let linedata = response.data
    return linedata
  },
  getForcompany: async function (thisparam) {
    const docRef = await doc(dbstore, "company", thisparam);
    const docSnap = await getDoc(docRef);
    let thisdata = await docSnap.data()
    return thisdata
  },
  getTokenlark: async function (thisforcompany) {
    let datares  = await axios.post('https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal', {
      'app_id': thisforcompany.lark_app_api,
      'app_secret': thisforcompany.lark_app_secret
    }, {
      headers: { 'Content-type': 'application/json; charset=utf-8' }
    })
    return datares.data.tenant_access_token;
  },
  send_message_by_userid: async function (thisstoken, thisforcompany, userId, datamessage) {
    let linetoken = thisforcompany.linetoken
    let thismessagetype = datamessage.message_data.message.type
    let datamessagekey = datamessage.id
    let contentdata = datamessage.message_data
    let datareturn = ""
    let userdataref = doc(dbstore, "userline_"+thisforcompany.name, userId);
    let userdataget = await getDoc(userdataref);
    let userdata = await userdataget.data()

    console.log(userdata)

    await functionjs.set_message_status(datamessagekey, thisforcompany, 'process')
    console.log(thismessagetype)
    switch(thismessagetype) {
      case 'text':
        let datasendtext = contentdata.message.text
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
        await functionjs.set_message_status(datamessagekey, thisforcompany, 'sent')
        break;
      case 'location':
        //let datasendtext = contentdata.message.text
        let addressname = ""
        if (contentdata.message.address) {
          addressname = contentdata.message.address + "\n"
        } else if (contentdata.message.title) {
          addressname = contentdata.message.title + "\n"
        }
        
        datareturn = await axios.post('https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id', {
          "receive_id": userdata.larkchatid,
          "msg_type": "text",
          "content": JSON.stringify({ "text": addressname + "https://www.google.com/maps?q="+contentdata.message.latitude+","+contentdata.message.longitude })
        }, {
          headers: {
            'Authorization': 'Bearer '+thisstoken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })
        await functionjs.set_message_status(datamessagekey, thisforcompany, 'sent')
        break;
      case 'file':
        let dataresultsentpdffile = ""
        let dataresultfile = ""
        console.log("fileSize")
        console.log(contentdata.message.fileSize)
        if (contentdata.message.fileSize > 3000000) {
            await axios.post('https://larkapi.soidea.co/uploadmaxfilegroupmessage', {
              "line_message_id": contentdata.message.id,
              "group_id": userdata.userId,
              "linetoken": linetoken,
              "larktoken": thisstoken,
              "larkchatid": userdata.larkchatid,
              "forcompany": thisforcompany.name
            }, {
              headers: {}
            })
        } else {
          dataresultfile = await axios({ 
            method: 'get', 
            responseType: 'arraybuffer',
            url: 'https://api-data.line.me/v2/bot/message/'+contentdata.message.id+'/content',
            headers: { 
              'Authorization': 'Bearer '+linetoken
            }
          })
          dataresultsentpdffile = await axios.post('https://open.larksuite.com/open-apis/im/v1/files', {
            "file_type": "pdf",
            "file_name": "pdffile_"+functionjs.makeid(20)+".pdf",
            "file": dataresultfile.data
          }, {
            headers: {
              'Authorization': 'Bearer '+thisstoken,
              'Content-Type': 'multipart/form-data' 
            }
          })
          datareturn = await axios.post('https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id', {
            "receive_id": userdata.larkchatid,
            "content": "{\"file_key\":\""+dataresultsentpdffile.data.data.file_key+"\"}",
            "msg_type": "file"
            }, {
              headers: {
                'Authorization': 'Bearer '+thisstoken,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              }
            })
          }

        await functionjs.set_message_status(datamessagekey, thisforcompany, 'sent')
        break;
      case 'sticker':
        datareturn = await axios.post('https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id', {
          "receive_id": userdata.larkchatid,
          "msg_type": "text",
          "content": JSON.stringify({ "text": "[ sticker ]" })
        }, {
          headers: {
            'Authorization': 'Bearer '+thisstoken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })
        await functionjs.set_message_status(datamessagekey, thisforcompany, 'sent')
        break;
      case 'audio':
        let dataresultaudio = await axios({ 
          method: 'get', 
          responseType: 'arraybuffer',
          url: 'https://api-data.line.me/v2/bot/message/'+contentdata.message.id+'/content',
          headers: { 
            'Authorization': 'Bearer '+linetoken
          }
        })

        let fileDataaudio = await dataresultaudio.data

        let dataresultsentaudio = await axios.post('https://open.larksuite.com/open-apis/im/v1/files', {
          "file_type": "opus",
          "duration": contentdata.message.duration,
          "file": fileDataaudio
        }, {
          headers: {
            'Authorization': 'Bearer '+thisstoken,
            'Content-Type': 'multipart/form-data' 
          }
        })
        console.log("dataresultsentaudio")
        //console.log(dataresultsentaudio)
        //sending audio message
        datareturn = await axios.post('https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id', {
          "receive_id": userdata.larkchatid,
          "content": JSON.stringify({
            "file_key": dataresultsentaudio.data.data.file_key
          }),
          "msg_type": "audio"
        }, {
          headers: {
            'Authorization': 'Bearer '+thisstoken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })

        await functionjs.set_message_status(datamessagekey, thisforcompany, 'sent')
        break;
      case 'video':
        console.log('video')
        let dataresultvideo = await axios({ 
          method: 'get', 
          responseType: 'arraybuffer',
          url: 'https://api-data.line.me/v2/bot/message/'+contentdata.message.id+'/content',
          headers: { 
            'Authorization': 'Bearer '+linetoken
          }
        })

        let fileData = dataresultvideo.data

        let dataresultsentvideo = await axios.post('https://open.larksuite.com/open-apis/im/v1/files', {
          "file_type": "mp4",
          "duration": contentdata.message.duration,
          "file_name": "video_"+functionjs.makeid(20)+".mp4",
          "file": fileData
        }, {
          headers: {
            'Authorization': 'Bearer '+thisstoken,
            'Content-Type': 'multipart/form-data' 
          }
        })

        let dataresultvideo_preview = await axios({ 
          method: 'get', 
          responseType: 'arraybuffer',
          url: 'https://api-data.line.me/v2/bot/message/'+contentdata.message.id+'/content/preview',
          headers: {  'Authorization': 'Bearer '+linetoken }
        })

        console.log("dataresultvideo_preview")

        let videoPrev = await axios.post('https://open.larksuite.com/open-apis/im/v1/images', {
          "image_type": "message",
          "image": dataresultvideo_preview.data
        }, {
          headers: {
            'Authorization': 'Bearer '+thisstoken,
            'Content-Type': 'multipart/form-data' 
          }
        })

        //sending video message
        datareturn = await axios.post('https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id', {
          "receive_id": userdata.larkchatid,
          "msg_type": "media",
          "content": JSON.stringify({
            "image_key": videoPrev.data.data.image_key,
            "file_key": dataresultsentvideo.data.data.file_key,
          })
        }, {
          headers: {
            'Authorization': 'Bearer '+thisstoken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })

        await functionjs.set_message_status(datamessagekey, thisforcompany, 'sent')
        break;
      case 'image':
        var dataresult = await axios({ 
          method: 'get', 
          responseType: 'arraybuffer',
          url: 'https://api-data.line.me/v2/bot/message/'+contentdata.message.id+'/content',
          headers: { 
            'Authorization': 'Bearer '+linetoken
          }
        })
        if (dataresult) {
          var dataresultsent = await axios.post('https://open.larksuite.com/open-apis/im/v1/images', {
            "image_type": "message",
            "image": dataresult.data
          }, {
            headers: {
              'Authorization': 'Bearer '+thisstoken,
              'Content-Type': 'multipart/form-data' 
            }
          })
          datareturn = await axios.post('https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id', {
            "receive_id": userdata.larkchatid,
            "msg_type": "image",
            "content": JSON.stringify({
              "image_key": dataresultsent.data.data.image_key
            })
          }, {
            headers: {
              'Authorization': 'Bearer '+thisstoken,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          })
          await functionjs.set_message_status(datamessagekey, thisforcompany, 'sent')
        }
        break;
      default:
    }
  
  },
  get_userlinegroup_member: async function (thisstoken, linetoken, userId, groupId) {
    let response = await axios.request({
      headers: {
        Authorization: `Bearer ${linetoken}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      method: "GET",
      url: 'https://api.line.me/v2/bot/group/'+groupId+'/member/' + userId
    })
    let linedata = response.data
    return linedata
  },
  send_message_by_groupid: async function (thisstoken, thisforcompany, groupId, datamessage, chattype) {
    let linetoken = thisforcompany.linetoken
    let thismessagetype = datamessage.message_data.message.type
    let datamessagekey = datamessage.id
    let contentdata = datamessage.message_data
    let datareturn = ""
    
    let userdataref = doc(dbstore, "usergroupline_"+thisforcompany.name, groupId);
    let userdataget = await getDoc(userdataref);
    let userdata = await userdataget.data()
    let thisuserget
    //console.log(datamessage.message_data.source.userId)
    if (chattype == "group") {
      await functionjs.set_groupmessage_status(datamessagekey, thisforcompany, 'process')
      thisuserget = await functionjs.get_userlinegroup_member(thisstoken, linetoken, datamessage.message_data.source.userId, groupId)
    } else {
      await functionjs.set_message_status(datamessagekey, thisforcompany, 'process')
      thisuserget = "LINE MESSAGE"
    }
    console.log(thisuserget)
    switch(thismessagetype) {
      case 'text':
        let datasendtext = contentdata.message.text
        datareturn = await axios.post('https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id', {
          "receive_id": userdata.larkchatid,
          "msg_type": "text",
          "content": JSON.stringify({ "text": "["+thisuserget.displayName+"] "+datasendtext })
        }, {
          headers: {
            'Authorization': 'Bearer '+thisstoken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })
        await functionjs.set_groupmessage_status(datamessagekey, thisforcompany, 'sent')
        break;
      case 'file':
        //console.log('file')

        let dataresultsentpdffile = ""
        let dataresultfile = ""


        if (contentdata.message.fileSize > 3000000) {
            await axios.post('https://larkapi.soidea.co/uploadmaxfilegroupmessage', {
              "line_message_id": contentdata.message.id,
              "group_id": userdata.groupId,
              "linetoken": linetoken,
              "larktoken": thisstoken,
              "forcompany": thisforcompany.name
            }, {
              headers: {}
            })
        } else {
          dataresultfile = await axios({ 
            method: 'get', 
            responseType: 'arraybuffer',
            url: 'https://api-data.line.me/v2/bot/message/'+contentdata.message.id+'/content',
            headers: { 
              'Authorization': 'Bearer '+linetoken
            }
          })
          dataresultsentpdffile = await axios.post('https://open.larksuite.com/open-apis/im/v1/files', {
            "file_type": "pdf",
            "file_name": "pdffile_"+functionjs.makeid(20)+".pdf",
            "file": dataresultfile.data
          }, {
            headers: {
              'Authorization': 'Bearer '+thisstoken,
              'Content-Type': 'multipart/form-data' 
            }
          })

          console.log(dataresultsentpdffile)
          console.log(thisuserget.displayName)

          // "content": "{\"en_us\":{\"title\":\"["+thisuserget.displayName+"]\",\"content\": [[{\"tag\": \"emotion\",\"emoji_type": "SMILE"}]]}}",

          await axios.post('https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id', {
            "receive_id": userdata.larkchatid,
            "content": "{ \"text\": \"["+thisuserget.displayName+"] Sent pdf file👇🏻\" }",
            "msg_type": "text"
          }, {
            headers: {
              'Authorization': 'Bearer '+thisstoken,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          })

          datareturn = await axios.post('https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id', {
            "receive_id": userdata.larkchatid,
            "content": "{\"file_key\":\""+dataresultsentpdffile.data.data.file_key+"\"}",
            "msg_type": "file"
            }, {
              headers: {
                'Authorization': 'Bearer '+thisstoken,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              }
            })
          }

        await functionjs.set_groupmessage_status(datamessagekey, thisforcompany, 'sent')
        break;
      case 'location':
        //let datasendtext = contentdata.message.text
        let addressname = ""
        if (contentdata.message.address) {
          addressname = contentdata.message.address + "\n"
        } else if (contentdata.message.title) {
          addressname = contentdata.message.title + "\n"
        }
        
        datareturn = await axios.post('https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id', {
          "receive_id": userdata.larkchatid,
          "msg_type": "text",
          "content": JSON.stringify({ "text": addressname + "https://www.google.com/maps?q="+contentdata.message.latitude+","+contentdata.message.longitude })
        }, {
          headers: {
            'Authorization': 'Bearer '+thisstoken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })
        await functionjs.set_groupmessage_status(datamessagekey, thisforcompany, 'sent')
        break;
      case 'sticker':
        datareturn = await axios.post('https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id', {
          "receive_id": userdata.larkchatid,
          "msg_type": "text",
          "content": JSON.stringify({ "text": "[ sticker ]" })
        }, {
          headers: {
            'Authorization': 'Bearer '+thisstoken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })
        await functionjs.set_groupmessage_status(datamessagekey, thisforcompany, 'sent')
        break;
      case 'audio':
        let dataresultaudio = await axios({ 
          method: 'get', 
          responseType: 'arraybuffer',
          url: 'https://api-data.line.me/v2/bot/message/'+contentdata.message.id+'/content',
          headers: { 
            'Authorization': 'Bearer '+linetoken
          }
        })

        let fileDataaudio = await dataresultaudio.data

        let dataresultsentaudio = await axios.post('https://open.larksuite.com/open-apis/im/v1/files', {
          "file_type": "opus",
          "duration": contentdata.message.duration,
          "file": fileDataaudio
        }, {
          headers: {
            'Authorization': 'Bearer '+thisstoken,
            'Content-Type': 'multipart/form-data' 
          }
        })
        console.log("dataresultsentaudio")
        //console.log(dataresultsentaudio)
        //sending audio message
        datareturn = await axios.post('https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id', {
          "receive_id": userdata.larkchatid,
          "content": JSON.stringify({
            "file_key": dataresultsentaudio.data.data.file_key
          }),
          "msg_type": "audio"
        }, {
          headers: {
            'Authorization': 'Bearer '+thisstoken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })

        await functionjs.set_groupmessage_status(datamessagekey, thisforcompany, 'sent')
        break;
      case 'video':
        console.log('video')
        let dataresultvideo = await axios({ 
          method: 'get', 
          responseType: 'arraybuffer',
          url: 'https://api-data.line.me/v2/bot/message/'+contentdata.message.id+'/content',
          headers: { 
            'Authorization': 'Bearer '+linetoken
          }
        })

        let fileData = dataresultvideo.data

        let dataresultsentvideo = await axios.post('https://open.larksuite.com/open-apis/im/v1/files', {
          "file_type": "mp4",
          "duration": contentdata.message.duration,
          "file_name": "video_"+functionjs.makeid(20)+".mp4",
          "file": fileData
        }, {
          headers: {
            'Authorization': 'Bearer '+thisstoken,
            'Content-Type': 'multipart/form-data' 
          }
        })

        let dataresultvideo_preview = await axios({ 
          method: 'get', 
          responseType: 'arraybuffer',
          url: 'https://api-data.line.me/v2/bot/message/'+contentdata.message.id+'/content/preview',
          headers: {  'Authorization': 'Bearer '+linetoken }
        })

        console.log("dataresultvideo_preview")

        let videoPrev = await axios.post('https://open.larksuite.com/open-apis/im/v1/images', {
          "image_type": "message",
          "image": dataresultvideo_preview.data
        }, {
          headers: {
            'Authorization': 'Bearer '+thisstoken,
            'Content-Type': 'multipart/form-data' 
          }
        })

        //sending video message
        datareturn = await axios.post('https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id', {
          "receive_id": userdata.larkchatid,
          "msg_type": "media",
          "content": JSON.stringify({
            "image_key": videoPrev.data.data.image_key,
            "file_key": dataresultsentvideo.data.data.file_key,
          })
        }, {
          headers: {
            'Authorization': 'Bearer '+thisstoken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })

        await functionjs.set_groupmessage_status(datamessagekey, thisforcompany, 'sent')
        break;
      case 'image':
        var dataresult = await axios({ 
          method: 'get', 
          responseType: 'arraybuffer',
          url: 'https://api-data.line.me/v2/bot/message/'+contentdata.message.id+'/content',
          headers: { 
            'Authorization': 'Bearer '+linetoken
          }
        })
        var dataresultsent = await axios.post('https://open.larksuite.com/open-apis/im/v1/images', {
          "image_type": "message",
          "image": dataresult.data
        }, {
          headers: {
            'Authorization': 'Bearer '+thisstoken,
            'Content-Type': 'multipart/form-data' 
          }
        })

        await axios.post('https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id', {
          "receive_id": userdata.larkchatid,
          "content": "{\"en_us\":{\"title\":\"["+thisuserget.displayName+"]\",\"content\": [[{\"tag\": \"img\",\"image_key\": \""+dataresultsent.data.data.image_key+"\"}]]}}",
          "msg_type": "post"
        }, {
          headers: {
            'Authorization': 'Bearer '+thisstoken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })
       
        await functionjs.set_groupmessage_status(datamessagekey, thisforcompany, 'sent')
        break;
      default:
    }
  
  },
  set_larkmessage_status: async function (datamessagekey, thisforcompany, statuschange) {
    let dataref = await collection(dbstore, "message_lark_"+thisforcompany.name)
    let datarefdoc = await doc(dataref, datamessagekey)
    try {
      await runTransaction(dbstore, async (transaction) => {
      const sfDoc = await transaction.get(datarefdoc);
        if (!sfDoc.exists()) {
          throw "Document does not exist!";
        }

        const newPopulation = statuschange;
        transaction.update(datarefdoc, { status: newPopulation });
      });
      console.log('Transaction success!');
    } catch (e) {
      console.log('Transaction failure:', e);
    }
  },
  set_grouplarkmessage_status: async function (datamessagekey, thisforcompany, statuschange) {
    let dataref = await collection(dbstore, "message_grouplark_"+thisforcompany.name)
    let datarefdoc = await doc(dataref, datamessagekey)
    try {
      await runTransaction(dbstore, async (transaction) => {
      const sfDoc = await transaction.get(datarefdoc);
        if (!sfDoc.exists()) {
          throw "Document does not exist!";
        }

        const newPopulation = statuschange;
        transaction.update(datarefdoc, { status: newPopulation });
      });
      console.log('Transaction success!');
    } catch (e) {
      console.log('Transaction failure:', e);
    }
  },
  set_message_status: async function (datamessagekey, thisforcompany, statuschange) {
    let dataref = await collection(dbstore, "message_line_"+thisforcompany.name)
    let datarefdoc = await doc(dataref, datamessagekey)
    try {
      await runTransaction(dbstore, async (transaction) => {
      const sfDoc = await transaction.get(datarefdoc);
        if (!sfDoc.exists()) {
          throw "Document does not exist!";
        }

        const newPopulation = statuschange;
        transaction.update(datarefdoc, { status: newPopulation });
      });
      console.log('Transaction success!');
    } catch (e) {
      console.log('Transaction failure:', e);
    }
  },
  set_groupmessage_status: async function (datamessagekey, thisforcompany, statuschange) {
    let dataref = await collection(dbstore, "message_groupline_"+thisforcompany.name)
    let datarefdoc = await doc(dataref, datamessagekey)
    try {
      await runTransaction(dbstore, async (transaction) => {
      const sfDoc = await transaction.get(datarefdoc);
        if (!sfDoc.exists()) {
          throw "Document does not exist!";
        }

        const newPopulation = statuschange;
        transaction.update(datarefdoc, { status: newPopulation });
      });
      console.log('Transaction success!');
    } catch (e) {
      console.log('Transaction failure:', e);
    }
  },
  compareBytime: function(a, b) {
    if (a.init_timestamp < b.init_timestamp) {
      return -1;
    }
    if (a.init_timestamp > b.init_timestamp) {
      return 1;
    }
    return 0;
  },
  query_message_by_larkchat: async function (thisstoken, thisforcompany , resuser) {
    let dataref = collection(dbstore, "message_lark_"+thisforcompany.name)
    let userId = resuser.user_id
    const q = query(dataref, where("status", "==", "wait"), where("user_id", "==", userId) );
    const querySnapshot = await getDocs(q);
    let newdatajson = []
    await querySnapshot.forEach(async (doc) => {
      let bodydata = doc.data()
      bodydata.id = doc.id
      newdatajson.push(bodydata)
    });
    await newdatajson.forEach(async (element) => {
      await functionjs.send_message_from_lark(thisstoken, thisforcompany, userId, element)
    });
  },
  send_message_from_lark: async function (thisstoken, thisforcompany, userId, datamessage) {
    let linetoken = thisforcompany.linetoken
    let userdataref = doc(dbstore, "userline_"+thisforcompany.name, userId);
    let userdataget = await getDoc(userdataref);
    let userdata = await userdataget.data()
    let datasendtext, datareturn
    let datamessagekey = datamessage.id
    console.log(datamessagekey)
    let imageresponse, videoresponse, fileresponse
    await functionjs.set_larkmessage_status(datamessagekey, thisforcompany, 'process')
    let thismessagetype = datamessage.message_data.message_type
    switch(thismessagetype) {
      case 'text':
        datasendtext = JSON.parse(datamessage.message_data.content).text
        if (datasendtext.includes('@_')) {} else {
          datareturn = await axios.post('https://api.line.me/v2/bot/message/push', {
            "to": userId,
            "messages": [
              {
                "type": thismessagetype,
                "text": datasendtext
              }
            ]
          }, {
            headers: {
              'Authorization': 'Bearer '+linetoken,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          })
        }
        await functionjs.set_larkmessage_status(datamessagekey, thisforcompany, 'sent')
        break;
      case 'post':
        datasendtext = JSON.parse(datamessage.message_data.content)
        console.log(datasendtext.content)
        let postnewtext = ""
        let checktag = false
        postnewtext = postnewtext + datasendtext.title + "\n"
        datasendtext.content.forEach((element) => {
          element.forEach((elementinner) => {
            if (elementinner.tag == "at") {
              checktag = true
            }
            postnewtext = postnewtext + elementinner.text + "\n"
          })
        });
        console.log(postnewtext)
        // console.log("checktag")
        // console.log(checktag)
        if (checktag == false) {
          datareturn = await axios.post('https://api.line.me/v2/bot/message/push', {
            "to": userId,
            "messages": [
              {
                "type": "text",
                "text": postnewtext
              }
            ]
          }, {
            headers: {
              'Authorization': 'Bearer '+linetoken,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          })
        }
        await functionjs.set_larkmessage_status(datamessagekey, thisforcompany, 'sent')
        break;
      case 'image':
        datasendtext = datamessage.message_data
        datareturn = await axios.request({
          headers: {
            Authorization: `Bearer ${thisstoken}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
          responseType: 'arraybuffer',
          method: "GET",
          url: 'https://open.larksuite.com/open-apis/im/v1/messages/'+datasendtext.message_id+'/resources/'+JSON.parse(datasendtext.content).image_key+'?type=image'
        })
        //console.log(datareturn)

        let filedata = datareturn
        const metadata = {
          contentType: 'image/jpeg'
        };
        const storageRef = await ref(storage, 'imageslark/' + functionjs.makeid(30) + "-image");
        const uploadTask = await uploadBytes(storageRef, filedata.data).then((snapshot) => {
          return getDownloadURL(snapshot.ref).then((downloadURL) => {
            return downloadURL
          });
        });

        await axios.post('https://api.line.me/v2/bot/message/push', {
          "to": userId,
          "messages": [
            {
              "type": thismessagetype,
              "originalContentUrl": uploadTask,
              "previewImageUrl": uploadTask
            }
          ]
        }, {
          headers: {
            'Authorization': 'Bearer '+linetoken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })
        await functionjs.set_larkmessage_status(datamessagekey, thisforcompany, 'sent')
        break;
      case 'media':
        datasendtext = datamessage.message_data
        let mediaUrlFile = 'https://open.larksuite.com/open-apis/im/v1/messages/'+datasendtext.message_id+'/resources/'+JSON.parse(datasendtext.content).file_key+'?type=file';
        let mediaUrlImage = 'https://open.larksuite.com/open-apis/im/v1/messages/'+datasendtext.message_id+'/resources/'+JSON.parse(datasendtext.content).image_key+'?type=image';
        //$filename = functionjs.makeid(30)+'.mp4';
        //$filename3 = functionjs.makeid(30)+'.jpg';
        

        let mediaUrlImageRes = await axios.request({
          headers: {
            Authorization: `Bearer ${thisstoken}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
          responseType: 'arraybuffer',
          method: "GET",
          url: mediaUrlImage
        })

        let mediaUrlFileRes = await axios.request({
          headers: {
            Authorization: `Bearer ${thisstoken}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
          responseType: 'arraybuffer',
          method: "GET",
          url: mediaUrlFile
        })


        //console.log(datareturn)

        const storageRef1 = await ref(storage, 'videoslark/' + functionjs.makeid(30) + "-" + JSON.parse(datasendtext.content).file_name);
        const uploadTask1 = await uploadBytes(storageRef1, mediaUrlFileRes.data).then((snapshot) => {
          return getDownloadURL(snapshot.ref).then((downloadURL) => {
            return downloadURL
          });
        });

        const storageRef2 = await ref(storage, 'videoslark/' + functionjs.makeid(30) + "-videopreview.jpg");
        const uploadTask2 = await uploadBytes(storageRef2, mediaUrlImageRes.data).then((snapshot) => {
          return getDownloadURL(snapshot.ref).then((downloadURL) => {
            return downloadURL
          });
        });

        await axios.post('https://api.line.me/v2/bot/message/push', {
          "to": userId,
          "messages": [
            {
              "type": "video",
              "originalContentUrl": uploadTask1,
              "previewImageUrl": uploadTask2
            }
          ]
        }, {
          headers: {
            'Authorization': 'Bearer '+linetoken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })
        await functionjs.set_larkmessage_status(datamessagekey, thisforcompany, 'sent')
        break;
      case 'file':
        console.log('this file')
        datasendtext = datamessage.message_data
        let mediaUrlFile2 = 'https://open.larksuite.com/open-apis/im/v1/messages/'+datasendtext.message_id+'/resources/'+JSON.parse(datasendtext.content).file_key+'?type=file';
        let mediaUrlFile2Res = await axios.request({
          headers: {
            Authorization: `Bearer ${thisstoken}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
          responseType: 'arraybuffer',
          method: "GET",
          url: mediaUrlFile2
        })
        //const storageRefforFile = await ref(storage, 'filelark/' + functionjs.makeid(30) + "-" + JSON.parse(datasendtext.content).file_name);
        // const uploadTaskforFile = await uploadBytes(storageRefforFile, mediaUrlFile2Res.data).then(async (snapshot) => {
        //   return await getDownloadURL(snapshot.ref).then((downloadURL) => {
        //     console.log(downloadURL)
        //     return downloadURL
        //   });
        // });
        //console.log('https://larkapi.soidea.co/uploadmaxfile/'+datasendtext.message_id+'/'+JSON.parse(datasendtext.content).file_key+'/'+thisstoken+'/'+userId+'/'+datamessagekey+'/'+thisforcompany.name+'/'+userId)
        await axios.post('https://larkapi.soidea.co/uploadmaxfile/'+datasendtext.message_id+'/'+JSON.parse(datasendtext.content).file_key+'/'+thisstoken+'/'+userId+'/'+datamessagekey+'/'+thisforcompany.name+'/'+userId, {
          "linetoken": linetoken,
        }, {
          headers: {}
        })
        await functionjs.set_larkmessage_status(datamessagekey, thisforcompany, 'sent')
        break;
    }
  },
  send_message_from_grouplark: async function (thisstoken, thisforcompany, groupId, datamessage) {
    let linetoken = thisforcompany.linetoken
    let userdataref = doc(dbstore, "usergroupline_"+thisforcompany.name, groupId);
    let userdataget = await getDoc(userdataref);
    let userdata = await userdataget.data()
    let datasendtext, datareturn
    let datamessagekey = datamessage.id
    console.log(datamessagekey)
    let imageresponse, videoresponse, fileresponse
    await functionjs.set_larkmessage_status(datamessagekey, thisforcompany, 'process')
    let thismessagetype = datamessage.message_data.message_type
    switch(thismessagetype) {
      case 'text':
        datasendtext = JSON.parse(datamessage.message_data.content).text
        if (datasendtext.includes('@_')) {} else {
          datareturn = await axios.post('https://api.line.me/v2/bot/message/push', {
            "to": groupId,
            "messages": [
              {
                "type": thismessagetype,
                "text": datasendtext
              }
            ]
          }, {
            headers: {
              'Authorization': 'Bearer '+linetoken,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          })
        }
        await functionjs.set_grouplarkmessage_status(datamessagekey, thisforcompany, 'sent')
        break;
      case 'post':
        datasendtext = JSON.parse(datamessage.message_data.content)
        console.log(datasendtext.content)
        let postnewtext = ""
        let checktag = false
        postnewtext = postnewtext + datasendtext.title + "\n"
        datasendtext.content.forEach((element) => {
          element.forEach((elementinner) => {
            if (elementinner.tag == "at") {
              checktag = true
            }
            postnewtext = postnewtext + elementinner.text + "\n"
          })
        });
        console.log(postnewtext)
        // console.log("checktag")
        // console.log(checktag)
        if (checktag == false) {
          datareturn = await axios.post('https://api.line.me/v2/bot/message/push', {
            "to": groupId,
            "messages": [
              {
                "type": "text",
                "text": postnewtext
              }
            ]
          }, {
            headers: {
              'Authorization': 'Bearer '+linetoken,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          })
        }
        await functionjs.set_grouplarkmessage_status(datamessagekey, thisforcompany, 'sent')
        break;
      case 'image':
        datasendtext = datamessage.message_data
        datareturn = await axios.request({
          headers: {
            Authorization: `Bearer ${thisstoken}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
          responseType: 'arraybuffer',
          method: "GET",
          url: 'https://open.larksuite.com/open-apis/im/v1/messages/'+datasendtext.message_id+'/resources/'+JSON.parse(datasendtext.content).image_key+'?type=image'
        })
        //console.log(datareturn)

        let filedata = datareturn
        const metadata = {
          contentType: 'image/jpeg'
        };
        const storageRef = await ref(storage, 'imageslark/' + functionjs.makeid(30) + "-image");
        const uploadTask = await uploadBytes(storageRef, filedata.data).then((snapshot) => {
          return getDownloadURL(snapshot.ref).then((downloadURL) => {
            return downloadURL
          });
        });

        await axios.post('https://api.line.me/v2/bot/message/push', {
          "to": groupId,
          "messages": [
            {
              "type": thismessagetype,
              "originalContentUrl": uploadTask,
              "previewImageUrl": uploadTask
            }
          ]
        }, {
          headers: {
            'Authorization': 'Bearer '+linetoken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })
        await functionjs.set_grouplarkmessage_status(datamessagekey, thisforcompany, 'sent')
        break;
      case 'media':
        datasendtext = datamessage.message_data
        let mediaUrlFile = 'https://open.larksuite.com/open-apis/im/v1/messages/'+datasendtext.message_id+'/resources/'+JSON.parse(datasendtext.content).file_key+'?type=file';
        let mediaUrlImage = 'https://open.larksuite.com/open-apis/im/v1/messages/'+datasendtext.message_id+'/resources/'+JSON.parse(datasendtext.content).image_key+'?type=image';
        //$filename = functionjs.makeid(30)+'.mp4';
        //$filename3 = functionjs.makeid(30)+'.jpg';
        

        let mediaUrlImageRes = await axios.request({
          headers: {
            Authorization: `Bearer ${thisstoken}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
          responseType: 'arraybuffer',
          method: "GET",
          url: mediaUrlImage
        })

        let mediaUrlFileRes = await axios.request({
          headers: {
            Authorization: `Bearer ${thisstoken}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
          responseType: 'arraybuffer',
          method: "GET",
          url: mediaUrlFile
        })


        //console.log(datareturn)

        const storageRef1 = await ref(storage, 'videoslark/' + functionjs.makeid(30) + "-" + JSON.parse(datasendtext.content).file_name);
        const uploadTask1 = await uploadBytes(storageRef1, mediaUrlFileRes.data).then((snapshot) => {
          return getDownloadURL(snapshot.ref).then((downloadURL) => {
            return downloadURL
          });
        });

        const storageRef2 = await ref(storage, 'videoslark/' + functionjs.makeid(30) + "-videopreview.jpg");
        const uploadTask2 = await uploadBytes(storageRef2, mediaUrlImageRes.data).then((snapshot) => {
          return getDownloadURL(snapshot.ref).then((downloadURL) => {
            return downloadURL
          });
        });

        await axios.post('https://api.line.me/v2/bot/message/push', {
          "to": groupId,
          "messages": [
            {
              "type": "video",
              "originalContentUrl": uploadTask1,
              "previewImageUrl": uploadTask2
            }
          ]
        }, {
          headers: {
            'Authorization': 'Bearer '+linetoken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })
        await functionjs.set_grouplarkmessage_status(datamessagekey, thisforcompany, 'sent')
        break;
      case 'file':
        console.log('this file')
        datasendtext = datamessage.message_data
        let mediaUrlFile2 = 'https://open.larksuite.com/open-apis/im/v1/messages/'+datasendtext.message_id+'/resources/'+JSON.parse(datasendtext.content).file_key+'?type=file';
        let mediaUrlFile2Res = await axios.request({
          headers: {
            Authorization: `Bearer ${thisstoken}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
          responseType: 'arraybuffer',
          method: "GET",
          url: mediaUrlFile2
        })
        //const storageRefforFile = await ref(storage, 'filelark/' + functionjs.makeid(30) + "-" + JSON.parse(datasendtext.content).file_name);
        // const uploadTaskforFile = await uploadBytes(storageRefforFile, mediaUrlFile2Res.data).then(async (snapshot) => {
        //   return await getDownloadURL(snapshot.ref).then((downloadURL) => {
        //     console.log(downloadURL)
        //     return downloadURL
        //   });
        // });
        //console.log('https://larkapi.soidea.co/uploadmaxfile/'+datasendtext.message_id+'/'+JSON.parse(datasendtext.content).file_key+'/'+thisstoken+'/'+userId+'/'+datamessagekey+'/'+thisforcompany.name+'/'+userId)
        await axios.post('https://larkapi.soidea.co/uploadmaxfilegroup/'+datasendtext.message_id+'/'+JSON.parse(datasendtext.content).file_key+'/'+thisstoken+'/'+groupId+'/'+datamessagekey+'/'+thisforcompany.name+'/'+groupId, {
          "linetoken": linetoken,
        }, {
          headers: {}
        })
        await functionjs.set_grouplarkmessage_status(datamessagekey, thisforcompany, 'sent')
        break;
    }
  },
  query_message_by_usergroup: async function (thisstoken, thisforcompany, groupId, type) {
    let dataref = collection(dbstore, "message_groupline_"+thisforcompany.name)
    if (type == "group"){
      const q = query(dataref, where("status", "==", "wait"), where("group_id", "==", groupId) );
      const querySnapshot = await getDocs(q);
      let newdatajson = []
      await querySnapshot.forEach(async (doc) => {
        let bodydata = doc.data()
        bodydata.id = doc.id
        newdatajson.push(bodydata)
      });

      await newdatajson.forEach(async (element) => {
        await functionjs.send_message_by_groupid(thisstoken, thisforcompany, groupId, element, 'group')
      });
      console.log("start query_message_by_user")
    } else {
      const q = query(dataref, where("status", "==", "wait"), where("user_id", "==", groupId) );
      const querySnapshot = await getDocs(q);
      let newdatajson = []
      await querySnapshot.forEach(async (doc) => {
        let bodydata = doc.data()
        bodydata.id = doc.id
        newdatajson.push(bodydata)
      });

      await newdatajson.forEach(async (element) => {
        await functionjs.send_message_by_groupid(thisstoken, thisforcompany, groupId, element, 'user')
      });
    }
  },
  query_message_by_user: async function (thisstoken, thisforcompany, userId) {
    let dataref = collection(dbstore, "message_line_"+thisforcompany.name)
    const q = query(dataref, where("status", "==", "wait"), where("user_id", "==", userId) );
    const querySnapshot = await getDocs(q);
    let newdatajson = []
    await querySnapshot.forEach(async (doc) => {
      let bodydata = doc.data()
      bodydata.id = doc.id
      newdatajson.push(bodydata)
    });

   
    console.log("querymessage line")
    await newdatajson.forEach(async (element) => {
      await functionjs.send_message_by_userid(thisstoken, thisforcompany, userId, element)
    });
    console.log("start query_message_by_user")
  },
  query_message_by_user_gpt: async function (thisstoken, thisforcompany, userId) {
    let dataref = collection(dbstore, "message_line_"+thisforcompany.name)
    const q = query(dataref, where("status", "==", "wait"), where("user_id", "==", userId) );
    const querySnapshot = await getDocs(q);
    let newdatajson = []
    await querySnapshot.forEach(async (doc) => {
      let bodydata = doc.data()
      bodydata.id = doc.id
      newdatajson.push(bodydata)
    });
    await newdatajson.forEach(async (element) => {
      await functionjs.send_message_by_userid(thisstoken, thisforcompany, userId, element)
    });
    console.log("start query_message_by_user")
  },
  makeid: function(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
  },
  file_get_contents: async function(uri) {
      let res = await axios.get(uri, { responseType:"blob" })
      return res
  }
};

export default functionjs;