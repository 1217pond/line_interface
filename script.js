function set_login_data(){//クッキーから読み込み
  if(~String(document.cookie).indexOf("account_name")){
    KeyText.value = Cookies.get('pass'); 
    NameText.value = Cookies.get('account_name'); 
  }
}
async function login(){//ログイン処理
  if(!login_suc){//ログイン済み対策
    try{
      pass = KeyText.value;//パスワード記録
      account_name = NameText.value;//ユーザーネーム記録
      textArea.innerHTML = "ログイン中...";
      
      for(let i = 0;i<encrypted_mainpass.length;i++){//main passの復号
        if(decrypt(encrypted_mainpass[i], pass) != ""){
          main_pass = decrypt(encrypted_mainpass[i], pass);
        }
      }
      if(main_pass == ""){//復号失敗処理
        throw "パスワードまたはユーザーネームが誤っています。";
      }
      for(let i = 0;i<encrypted_accounts.length;i++){//ユーザーネーム存在確認
        if(decrypt(encrypted_accounts[i],pass) == account_name && account_name != ""){
          login_suc = true;
        }
      }
      if(login_suc){//存在判定
        console.log("login success.");
        textArea.innerHTML = "ログインしています。";
        Cookies.set('pass', pass, {expires: 7});
        Cookies.set('account_name', account_name, {expires: 7});
        document.getElementById('loginArea').remove();
        token = decrypt(encrypted_token,main_pass);
        desting();
      }else{
        console.log("login canceled.");
        textArea.innerHTML = "ログインできませんでした。";
      }
    }catch(e){
      console.log("login failed.");
      textArea.innerHTML = "エラーが発生しました。"+String(e);
    }
  }else{
    textArea.innerHTML = "すでにログインしています。";
  }
}
async function desting(){//送信先入力フォームの生成
  //履歴に書き込み
  let client_datas = [client_data.ip,client_data.country,client_data.region,client_data.city,account_name];
  account_id = await request({"use":"before","name":account_name,"client":JSON.stringify(client_datas,undefined,2),"pass":main_pass,"crossDomain":true});
  //送信先入力フォームの生成
  destArea.removeAttribute("hidden");
  var state_label = document.createElement("p");
  state_label.textContent = "ルーム読み込み中...";
  destArea.appendChild(state_label)
  let rooms = JSON.parse(await request({"use":"room","pass":main_pass,"name":account_name,"crossDomain":true}));
  state_label.remove();
  for(let i = 0; i < rooms.length; i++){
    let res = await get_profile(rooms[i]);
    let room_name = res[0];
    let room_icon_url = res[1];
    let room_area = document.createElement("div");
    room_area.className = "roomframe";
    let room_icon = document.createElement("img");
    room_icon.src=room_icon_url;
    room_icon.width=30;
    room_icon.height=30;
    room_area.appendChild(room_icon);
    let display_button = document.createElement("input");
    display_button.type = "button";
    display_button.value = room_name;
    display_button.dataset["name"] = room_name;
    display_button.dataset["id"] = rooms[i];
    display_button.className = "roomsender";
    room_area.appendChild(display_button);
    
    destArea.appendChild(room_area);
  }
  var chat_label = document.createElement('div');
  if(rooms.length == 0){
    chat_label.innerHTML = "参加しているルームは見つかりませんでした。";
  }else{
    chat_label.innerHTML = "ルームを選択してください。";
  }
  chat_label.id = "chat_label";
  destArea.appendChild(chat_label);
  let buttons = document.querySelectorAll('#destArea input');
  for(let i = 0; i < buttons.length; i++){
    buttons[i].addEventListener('click', chat);
  }
}

async function chat(e){//チャット表示 
  var dest_input = document.getElementById("DestText");//エレメントの読み込み
  var chat_label = document.getElementById("chat_label");
  try{
    room = e.currentTarget.dataset["name"];
    room_id = e.currentTarget.dataset["id"];
    chatArea.removeAttribute("hidden");
    update();
  }catch(e){
    chat_label.innerHTML = "エラーが発生しました。"+String(e);
  }
}

function image_sender(){
  img_selected = false;
  sendArea.innerHTML = '<input type="file" id="img_selector" accept="image/*"><br><input type="button" id="send_button" value="送信"><input type="button" id="text_button" value="テキスト"><input type="button" id="icon_button" value="アイコン変更" disabled><br>';
  document.getElementById("send_button").addEventListener("click",image_send);
  document.getElementById("text_button").addEventListener("click",reset_sendArea);
  document.getElementById("icon_button").addEventListener("click",icon_updater);
  document.getElementById("img_selector").addEventListener("change",preview_img);
}

function preview_img(){
  img_selected = true;
  let preview = document.createElement('img');
  preview.height = 400;
  preview.id = "img_src";
  let file = document.getElementById("img_selector").files[0];
  let reader = new FileReader();
  reader.addEventListener("load",function(){
    preview.src = reader.result;
    sendArea.appendChild(preview);
  });
  if(file){
    reader.readAsDataURL(file);
  }
}

async function image_send(){
  chat_label.innerHTML = `------------------------------<br>${room}<br>------------------------------<br>画像送信中...`;
  if(img_selected){
    try{
      let canvas = document.createElement("canvas");
      let img_src = document.getElementById("img_src");
      let img_comment = document.getElementById("comment_text").value;
      canvas.width = img_src.width;
      canvas.height = img_src.height;
      let ctx = canvas.getContext("2d");
      ctx.drawImage(img_src,0,0,img_src.width,img_src.height);
      let img_base64 = canvas.toDataURL("image/png").substr(22);
      let img_str = atob(img_base64);
      encrypted_img_str = encrypt(img_str,log_pass);
      let log_json = await read(log_path);
      let room_json = await read("room.json");
      if(img_comment == ""){
        log_json[encrypted_account_name]["log"].push(encrypt(`<PATH_OF_IMG>${room_json["writed_images"]}`,log_pass));
      }else{
        log_json[encrypted_account_name]["log"].push(encrypt(`<PATH_OF_IMG>${room_json["writed_images"]}<COMMENT>${img_comment}`,log_pass));
      }
      log_json[encrypted_account_name]["time"].push(Math.round((new Date()).getTime() / 1000));
      log_json[encrypted_account_name]["readed"].push([]);
      room_json["writed_images"]++;
      await write([log_path,"room.json",`${room_json["writed_images"]-1}.txt`],[JSON.stringify(log_json,undefined,2),JSON.stringify(room_json,undefined,2),encrypted_img_str],3);
      
      console.log("image send success.");
        chat_label.innerHTML = `------------------------------<br>${room}<br>------------------------------<br>送信しました。`;
    }catch(e){
      chat_label.innerHTML = `------------------------------<br>${room}<br>------------------------------<br>送信エラー:${e}`;
    }
    reset_sendArea();
  }else{
    chat_label.innerHTML = `------------------------------<br>${room}<br>------------------------------<br>画像を選んでください。`;
  }
  window.setTimeout(update, 2000);
}

function reset_sendArea(){
  sendArea.removeAttribute("hidden");
  sendArea.innerHTML = '<textarea cols="60" rows="10" wrap="off" id="send_text"></textarea><br><input type="button" id="send_button" value="送信"><input type="button" id="image_button" value="画像" disabled><input type="button" id="icon_button" value="アイコン変更" disabled><input type="button" id="retry_button" value="再読み込み">';
  document.getElementById("send_button").addEventListener("click",send);
  document.getElementById("image_button").addEventListener("click",image_sender);
  document.getElementById("icon_button").addEventListener("click",icon_updater);
  document.getElementById("retry_button").addEventListener("click",() => {update(false)});
}

async function update(sendArea_update = true){//チャットの更新
  chatArea.innerHTML = '';
  if(sendArea_update){
    reset_sendArea();
  }
  chat_label.innerHTML = `------------------------------<br>${room}<br>------------------------------<br>データ取得中...`;
  let room_data = JSON.parse(await request({"use":"log","room_id":room_id,"user_id":account_id,"pass":main_pass}));
  let profiles = room_data.profile;
  let log_data = room_data.log.reverse();
  my_icon_url = profiles[account_id].icon;
  chat_label.innerHTML = `------------------------------<br>${room}<br>------------------------------<br>表示処理中...`;
  for(let log_mes of log_data){
    let comment = document.createElement("div");
    comment.className = "comment";
    let date = new Date(log_mes.time);
    let user_icon = document.createElement("img");
    user_icon.src = profiles[log_mes.user].icon;
    user_icon.height = 30;
    comment.appendChild(user_icon);
    switch(log_mes.type){
      case "text":
        let comment_label = document.createElement("font");
        comment_label.className = "FontAAB";
        comment_label.innerHTML = `${date.toLocaleDateString()} ${date.toLocaleTimeString()} ${profiles[log_mes.user].name}>><br>${log_mes.text}`;
        comment.appendChild(comment_label);
    }
    chatArea.appendChild(comment);
  }
  chat_label.innerHTML = `------------------------------<br>${room}<br>------------------------------`;
  console.log("update success.");
}

function icon_updater(){
  img_selected = false;
  sendArea.innerHTML = '<input type="file" id="img_selector" accept="image/*"><br><input type="button" id="change_button" value="変更"><input type="button" id="cancel_button" value="キャンセル"><br>';
  document.getElementById("change_button").addEventListener("click",icon_update);
  document.getElementById("cancel_button").addEventListener("click",reset_sendArea);
  document.getElementById("img_selector").addEventListener("change",preview_icon);
}

function preview_icon(){
  img_selected = true;
  let preview = document.createElement('img');
  preview.height = 100;
  preview.width = 100;
  preview.id = "img_src";
  let file = document.getElementById("img_selector").files[0];
  let reader = new FileReader();
  reader.addEventListener("load",function(){
    preview.src = reader.result;
    sendArea.appendChild(preview);
  });
  if(file){
    reader.readAsDataURL(file);
  }
}

async function icon_update(){
  if(img_selected){
    try{
      chat_label.innerHTML = `------------------------------<br>${room}<br>------------------------------<br>アイコン送信中...`;
      let canvas = document.createElement("canvas");
      let img_src = document.getElementById("img_src");
      canvas.width = 40;
      canvas.height = 40;
      let ctx = canvas.getContext("2d");
      ctx.drawImage(img_src,0,0,40,40);
      let img_base64 = canvas.toDataURL("image/png").substr(22);
      let img_str = atob(img_base64);
      encrypted_img_str = encrypt(img_str,log_pass);
      let log_json = await read(log_path);
      if(log_json[encrypted_account_name]["icon"] == "none"){
        let room_json = await read("room.json");
        log_json[encrypted_account_name]["icon"] = String(room_json["writed_images"]);
        room_json["writed_images"]++;
        await write([`${room_json["writed_images"] - 1}.txt`,log_path,"room.json"],[encrypted_img_str,JSON.stringify(log_json,undefined,2),JSON.stringify(room_json,undefined,2)],3);
      }else{
        await write(`${log_json[encrypted_account_name]["icon"]}.txt`,encrypted_img_str);
      }
      
      console.log("image send success.");
      chat_label.innerHTML = `------------------------------<br>${room}<br>------------------------------<br>変更しました。`;
    }catch(e){
      chat_label.innerHTML = `------------------------------<br>${room}<br>------------------------------<br>送信エラー:${e}`;
    }
    reset_sendArea();
  }else{
    chat_label.innerHTML = `------------------------------<br>${room}<br>------------------------------<br>画像を選んでください。`;
  }
}

function send(){
  if(document.getElementById("send_text").value != ""){
    try{
      chat_label.innerHTML = `------------------------------<br>${room}<br>------------------------------<br>送信中...`;
      let send_data = document.getElementById("send_text").value;
      request({use:"send",pass:main_pass,user_id:account_id,room_id:room_id,SendData:JSON.stringify({
        "type":"text",
        "text":send_data,
        "sender":{
          "name":account_name,
          "iconUrl":my_icon_url
        }
      })});
      console.log("send success.");
      chat_label.innerHTML = `------------------------------<br>${room}<br>------------------------------<br>送信しました。`;
    }catch(e){
      chat_label.innerHTML = `------------------------------<br>${room}<br>------------------------------<br>送信エラー:${e}`;
      console.log(e);
    }
    reset_sendArea();
    window.setTimeout(update, 5000);
  }else{
    chat_label.innerHTML = `------------------------------<br>${room}<br>------------------------------<br>テキストを入力してください。`;
    window.setTimeout(() => {
      chat_label.innerHTML = `------------------------------<br>${room}<br>------------------------------`;
    }, 2000);
  }
}

function encrypt(src,key){
  return CryptoJS.AES.encrypt(src, key).toString();
}

function decrypt(src, key){
  try{
    return CryptoJS.AES.decrypt(src, key).toString(CryptoJS.enc.Utf8);
  }catch(e){
    console.log(e);
    return "";
  }
}

async function request(
  data,
  url="https://script.google.com/macros/s/AKfycbz1F65xLaRJTOi4Bv5_mGhSV7KcfEE0IgMGroacMCiPdMGfhqfjpItrF22ESYEyvENB0A/exec"
){
  return new Promise((resolve,reject) => {
    $.post(url,data,d => {
      resolve(d);
    });
  });
}

async function get_profile(id){
  return JSON.parse(await request({"use":"profile","id":id,"pass":main_pass,"crossDomain":true}));
}

function read(path,json_parse = true){
  return new Promise((resolve,reject) => {
    if(path in downloaded_images){
      resolve(downloaded_images[path]);
    }else{
      $.post(url,{"use":"read","path":path,"pass":main_pass,"crossDomain":true},data => {
        if(json_parse){
          resolve(JSON.parse(data));
        }else{
          resolve(data);
        }
        if(path.substr(-3,3) == "txt"){
          downloaded_images[path] = data;
        }
      });
    }
  });
}

function write(path,src){
  return new Promise(async (resolve,reject) => {
    if(typeof path == "string"){
      path = [path];
      src = [src];
    }

    for(let i = 0;i<path.length;i++){
      await one_write(path[i],src[i]);
    }
    console.log("write success");
    resolve("write success");
    if(path.includes(log_path)){
      dataConnection.send(`<update>${log_path}`);
    }
  });
};

function one_write(path,src){
  return new Promise((resolve,reject) => {
    $.post(url,{"use":"write","path":path,"src":src,"pass":main_pass,"crossDomain":true},data => {
      resolve(data);
    });
  });
}

let encrypted_mainpass = [
  "U2FsdGVkX18SsZ7NI6YcVfLnF0AFxdzk3ihxOUV4f4ozac7vp3hrvudJ7heDQ2xD/1cO3nZvhs3aCsgZGmwSFg==",
  "U2FsdGVkX1/FvkQDrTV0u56M2YTu+jQE6//v3/0SgtCSGiiQAVIJWD3F4JsY0+duVGnZCNCheAaTOZ55ctxWDw==",
  "U2FsdGVkX19jqkYg+ZkAq1NRn3i3A3B9n6Il0Ww0f4wwnS7pbqL2C1qynf8riwAzu6FSAJXpNL+1cI0aC9IBxw=="
];
let encrypted_accounts = [
  "U2FsdGVkX18I9MrANHDyIiJZP/ZG4M1D247lqwuFUjw=",
  "U2FsdGVkX1/Dnsss8r32TJsQfau8iPweBezIEBsIvEc=",
  "U2FsdGVkX19PnhZYsYazIjUK0IYiH2nw6btt4uyIHfk="
]
let encrypted_token = "U2FsdGVkX18oKVdt4c+4NOyGVaaRy8uXMnx6aR2RiWf3j7Oz/aCVbohqdQFxxpYvDqJatwgX2Q1FKFM52ZPAZJmKXcZknuN/iA75oozwky61mGnKHefhsZsZw5JYtmiKJe3aKkgZkydavuFbeD6f5zJ+TyS8V6RmP6+7F32fLilqE7iTvVn0y4Vy4ecJA5mnupwk/+HYXWmuEvvOhxuQ8SuhDEddd0pu/dvWk/Fy5JFC63WbIJDm/gHVTO3Z/eBo";
let token = "";
let main_pass = "";
let textArea = document.getElementById("textArea");//ステータスエリア
let destArea = document.getElementById('destArea');//送信先エリア
let chatArea = document.getElementById('chatArea');//チャットエリア
let sendArea = document.getElementById('sendArea');//送信エリア

let pass = "";
let account_name = "";
let account_id = "";
let room_id = "";
let room = "";
let login_suc = false;  
let delete_boxes = [];
let client_data = {
  "ip":"anonymous",
  "country":"anonymous",
  "region":"anonymous",
  "city":"anonymous"
};
let img_selected = false;
let encrypted_img_str = "";
let icons = [];
let downloaded_images = {};
let profiles = {};
let my_icon_url = "";

$.get("https://ipinfo.io", function(res) {client_data = res;}, "jsonp");

let url = "https://script.google.com/macros/s/AKfycbz1F65xLaRJTOi4Bv5_mGhSV7KcfEE0IgMGroacMCiPdMGfhqfjpItrF22ESYEyvENB0A/exec";

Button.addEventListener("click",login);
DeleteButton.addEventListener("click",() => {
  Cookies.remove("pass");
  Cookies.remove("account_name");
});
set_login_data();
