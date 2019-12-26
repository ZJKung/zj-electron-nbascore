const axios = require('axios');
const scoreboardUrl = 'http://data.nba.net/prod/v2/{{date}}//scoreboard.json';
const pbpUrl = 'http://data.nba.net/10s/json/cms/noseason/game/{{date}}/{{gameid}}/pbp_last.json'
const moment = require('moment');
const {BrowserWindow} = require('electron').remote;
const ipcRenderer = require('electron').ipcRenderer;
const path = require('path');

var eventId = 0;
var isSubscribe = true;

/** get main Global variable
 * return object 
 */
function getGlobalObject() {
    let sharedObject = require('electron').remote.getGlobal('sharedObject');
    return sharedObject;
}

const nowDate = moment(getGlobalObject().Date).format('YYYY-MM-DD');

//Init Date
let datePicker = document.querySelector('.date');
datePicker.value = nowDate;



//init date
awaitGenerateData(moment(getGlobalObject().Date).format('YYYYMMDD'));

//date time change function
datePicker.addEventListener('change', () => {
    ipcRenderer.send('setDate', moment(datePicker.value).toString());
    console.log(datePicker.value);
    awaitGenerateData(moment(datePicker.value).format('YYYYMMDD').toString());
});


//call axios nba api to get date
function awaitGenerateData(date) {
    //date=moment(getGlobalObject().Date).format('YYYYMMDD')
    getGame(date).then(
        data => {
            console.log(data);
            //generate table date
            setGameList(data.games);
            //all boxscore elements 
            const boxScoreWindows = document.querySelectorAll('.boxscore');
            //add event listener to boxscore click
            boxScoreWindows.forEach((boxScoreWindow) => {
                let gameId = (boxScoreWindow.id).split('-')[1];
                boxScoreWindow.addEventListener('click', () => {
                    const modalPath = path.join('file://', __dirname, `./boxscoreModal.html`);
                    let win = new BrowserWindow({
                        width: 800,
                        height: 600,
                        transparent: true,
                        frame: false,
                        webPreferences: {
                            nodeIntegration: true
                        }
                    });
                    win.webContents.on('did-finish-load', () => {
                        win.webContents.send('id', gameId);
                    });

                    win.on('close', () => {
                        win = null
                    });
                    win.loadURL(modalPath);
                    win.show();
                });
            });

            const subscriptionButton = document.querySelectorAll('.pbp');

            subscriptionButton.forEach(item => {
                item.addEventListener('click', () => {
                    const gameId = item.id.split('-')[1];
                    if (item.textContent == 'Subscribe') {
                        isSubscribe = true;
                        eventId=0;
                        item.textContent = 'UnSubscribe';
                        const vCode=item.parentNode.children[0].innerText;
                        const hCode=item.parentNode.children[1].innerText;

                        NotifyLastPlaybyPlay(gameId,vCode,hCode);
                    } else {
                        isSubscribe = false;
                        eventId=0;
                        item.textContent = 'Subscribe';
                    }
                })
            });


        });
}

function NotifyLastPlaybyPlay(gameid,vCode,hCode) {
    const url = pbpUrl.replace('{{date}}', moment(getGlobalObject().Date).format('YYYYMMDD')).replace('{{gameid}}', gameid);
    if (isSubscribe) {
        axios.get(url).then(function (res) {
                const play = res.data.sports_content.play;
                if (eventId != play.event) {
                    eventId = play.event;
                    const notification = {
                        title: `${hCode} :${play.home_score} : ${vCode}: ${play.visitor_score} `,
                        body: `time ${play.clock} left, ${play.description}`
                    };
                    new window.Notification(notification.title, notification);
                }
                setTimeout(() => {
                    NotifyLastPlaybyPlay(gameid,vCode,hCode);
                }, 1);
                //isSubscribe = false;
                //setInterval(NotifyLastPlaybyPlay(gameid), 3000);                

            })
            .catch(function (error) {
                //break;
                //console.error(error);
                const notification = {
                    title: 'Error',
                    body: `${error}`
                };
                new window.Notification(notification.title, notification);
                isSubscribe = false;
            });
    }

}

function getGame(gameDate) {
    console.log(gameDate);
    let url = scoreboardUrl.replace('{{date}}', gameDate);

    console.log(url);
    return axios.get(url)
        .then(function (response) {
            // handle success
            return response.data;
        })
        .catch(function (error) {
            // handle error
        });
}

function setGameList(games) {
    document.getElementById("gamelist").innerHTML = '';
    games.forEach((game, index) => {

        document.getElementById("gamelist").innerHTML +=
            (
                '<li class="list-group-item font-weight-bolder">' +
                `<div class="game">Game${index+1}</div> <h4 class="team">${game.vTeam.triCode} vs ${game.hTeam.triCode}</h4>`+
                `<div class="score">${game.statusNum!=1?`${game.vTeam.score} : ${game.hTeam.score}`:``} </div>`+
                '<div></div>'+
                `${game.statusNum==2?`<button class="pbp btn-danger" id="pbp-${game.gameId}">Subscribe</button>`:""} ` +
                `${game.statusNum!=1?`<button class="boxscore btn-primary" id="boxscore-${game.gameId}" ">Boxscore</button>`:""}` +
                //`${game.isGameActivated?`<button class="pbp btn-danger" id="pbp-${game.gameId}">Follow</button>`:`<button class="boxscore btn-primary" id="boxscore-${game.gameId}">Boxscore</button>`}` +
                '</li>');
    });
}