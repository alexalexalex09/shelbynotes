var el = `
<div id="pn_noteButton" onclick="pn_show()">Show Private Note</div>
<div id="pn_notification" class="off"></div>
<div id="pn_noteContainer" class="off">
  <div id="pn_browse"></div>
  <div id="pn_closeButton" onclick="pn_hide()">X</div>
  <form id="pn_form">
    <textarea id="pn_textarea">Loading...</textarea>
    <input type="submit"></input>
  </form>
  <div id="pn_unsaved"></div>
  <div id="pn_counter" class="off">0</counter>
</div>
`;
el = `<div id="pn_container">` + el + `</div>`;
document.body.appendChild(pn_htmlToElem(el));
pn_getLatestText();

/**************/
/* Functions  */
/**************/
/*const scripts = `*/
function pn_htmlToElem(html) {
  let temp = document.createElement("template");
  html = html.trim(); // Never return a space text node as a result
  temp.innerHTML = html;
  return temp.content.firstChild;
}

function pn_show() {
  document.querySelector("#pn_noteContainer").classList.remove("off");
}

function pn_hide() {
  document.querySelector("#pn_noteContainer").classList.add("off");
}

function pn_getID() {
  var url = window.location.href;
  var id = url.substr(url.lastIndexOf("/") + 1);
  id = id.replace(/[^0-9]/, "");
  console.log({ id });
  return id;
}

function pn_getLatestText() {
  var id = pn_getID();
  var localText = localStorage.getItem(id);
  var getStorage = true;
  if (localText != null) {
    document.querySelector("#pn_notification").innerHTML = "<i>1</i>";
    document.querySelector("#pn_notification").classList.remove("off");
    getStorage = false;
    console.log({ localText });
    document.querySelector("#pn_textarea").value = localText;
    document.querySelector(
      "#pn_unsaved"
    ).innerHTML = `Unsaved changes have been recovered. <button id="pn_discard">Discard Changes</button>`;
    document
      .querySelector("#pn_discard")
      .addEventListener("click", function () {
        var res = confirm("Are you sure you want to discard unsaved changes?");
        if (res) {
          localStorage.removeItem(id);
          getStorage = true;
          document.querySelector("#pn_unsaved").innerHTML = "";
          console.log("You said yes!");
          pn_getSyncStorage();
        }
      });
  } else {
    pn_getSyncStorage();
  }
}

function pn_getSyncStorage() {
  var id = pn_getID();
  chrome.storage.sync.get([id], function (result) {
    console.log("result found");
    console.log({ result });
    obj = result;
    console.log(
      obj == null,
      typeof obj == "undefined",
      typeof obj[id] == "undefined"
    );
    //var obj = JSON.parse(localStorage.getItem(id));
    if (
      obj == null ||
      typeof obj == "undefined" ||
      typeof obj[id] == "undefined"
    ) {
      document.querySelector("#pn_notification").innerHTML = "";
      document.querySelector("#pn_notification").classList.add("off");
      document.querySelector("#pn_textarea").value = "";
      return null;
    } else {
      console.log({ obj });
      obj = JSON.parse(obj[id]);
      obj.notes.sort((a, b) => {
        return b.date - a.date;
      });
      console.log({ obj });
      document.querySelector("#pn_notification").innerHTML = obj.notes.length;
      document.querySelector("#pn_notification").classList.remove("off");
      var date = new Date();
      var dateString =
        date.toLocaleDateString() + " " + date.toLocaleTimeString();
      document.querySelector("#pn_textarea").value = obj.notes[0].text;
      document.querySelector("#pn_browse").innerHTML =
        `<button id="pn_back"><<</button><button id="pn_forward">>></button><div id="pn_date">` +
        dateString +
        `</div>`;
      document.querySelector("#pn_back").addEventListener("click", function () {
        var counter = document.querySelector("#pn_counter").innerHTML;
        counter = Number(counter) + 1;
        if (typeof obj.notes[counter] != "undefined") {
          document.querySelector("#pn_textarea").value =
            obj.notes[counter].text;
          document.querySelector("#pn_counter").innerHTML = counter;
          var date = new Date(Number(obj.notes[counter].date));
          console.log(typeof date);
          var dateString =
            date.toLocaleDateString() + " " + date.toLocaleTimeString();
          document.querySelector("#pn_date").innerHTML = dateString;
        }
      });
      document
        .querySelector("#pn_forward")
        .addEventListener("click", function () {
          var counter = document.querySelector("#pn_counter").innerHTML;
          if (counter > 0) {
            counter = Number(counter) - 1;
            if (typeof obj.notes[counter] != "undefined") {
              document.querySelector("#pn_textarea").value =
                obj.notes[counter].text;
              document.querySelector("#pn_counter").innerHTML = counter;
              var date = new Date(Number(obj.notes[counter].date));
              var dateString =
                date.toLocaleDateString() + " " + date.toLocaleTimeString();
              document.querySelector("#pn_date").innerHTML = dateString;
            }
          }
        });
    }
  });
}

document.querySelector("#pn_form").addEventListener("submit", function (e) {
  e.preventDefault();
  pn_saveData();
});

document.querySelector("#pn_textarea").addEventListener("input", function () {
  var id = pn_getID();
  var text = document.querySelector("#pn_textarea").value;
  console.log({ text });
  localStorage.setItem(id, text);
});

function pn_saveData() {
  var id = pn_getID();
  chrome.storage.sync.get([id], function (result) {
    console.log(result);
    if (typeof result[id] == "undefined") {
      obj = { notes: [] };
    } else {
      obj = JSON.parse(result[id]);
    }
    var text = document.querySelector("#pn_textarea").value;
    var date = Date.now().toString();
    console.log({ obj });
    obj.notes.push({ date: date, text: text });
    str = JSON.stringify(obj);
    var toSave = {};
    toSave[id] = str;
    chrome.storage.sync.set(toSave, function () {
      localStorage.removeItem(id);
      document.querySelector("#pn_counter").innerHTML = 0;
      console.log("Value is set to ", toSave);
      pn_getSyncStorage();
    });
  });
  return false;
}

const pn_script = document.createElement("script");
var keyValues = [],
  global = window; // window for browser environments

var keyValues = [],
  global = window; // window for browser environments
for (var prop in global) {
  if (prop.indexOf("pn_") == 0)
    // check the prefix
    keyValues.push(global[prop]);
}
pn_script.innerHTML = keyValues.join(" ");
document.head.appendChild(pn_script);

/**************/
/*   Styles   */
/**************/
const pn_style = document.createElement("style");
pn_style.innerHTML = `
#pn_noteContainer {
    position: absolute;
    background: white;
    width: clamp(50%, 50rem, 100%);
    height: max(10%, 15rem);
    border: 2px solid black;
    padding: 5px;
    border-radius: 5px;
    bottom: 0;
    left: 0;
}

#pn_textarea {
    height: calc(100% - 2rem);
    width: 100%;
}

#pn_form {    
    height: calc(100% - 1.5rem);
    width: 100%;
}

.off {
    display:none;
}

#pn_noteButton {
    position: absolute;
    bottom: 0;
    height: 3rem;
    width: auto;
    background: #006980;
    padding: 15px;
    border-radius: 5px;
    display: grid;
    align-content: center;
    color: white;
    font-size: 1.3rem;
    margin: 3px;
    cursor: pointer;
}

#pn_unsaved {
  position: relative;
  color: red;
  bottom: 5px;
  margin-left: 5rem;
}

#pn_closeButton {
    text-align: right;
    color: black;
    font-weight: bold;
    cursor: pointer;
    width: 1rem;
    float: right;
}

#pn_discard {
  background: #efefef;
  color: black;
}

#pn_browse {
  float: left;
  height: 1.5rem;
  margin-top: -3px;
  font-size: .7rem;
}

#pn_date {
  float: right;
  font-size: 1rem;
  margin-left: 5px;
}

#pn_notification {
  background-color: red;
  border-radius: 50px;
  position: absolute;
  width: 1.3rem;
  height: 1.3rem;
  bottom: 2.5rem;
  left: 12.5rem;
  text-align: center;
  color: white;
}

`;
document.head.appendChild(pn_style);
