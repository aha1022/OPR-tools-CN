// ==UserScript==
// @name         OPR tools CN
// @version      1.0.0-alpha
// @description  Add links to maps, rate on common objects, and other small improvements
// @author       CubicPill
// @match        https://opr.ingress.com/recon
// @grant        unsafeWindow
// @homepageURL  https://github.com/CubicPill/OPR-tools-CN
// @downloadURL  https://raw.githubusercontent.com/CubicPill/OPR-tools-CN/master/opr_tools_cn.user.js
// @updateURL    https://raw.githubusercontent.com/CubicPill/OPR-tools-CN/master/opr_tools_cn.user.js
// @supportURL   null
// @require      https://raw.githubusercontent.com/wandergis/coordtransform/master/index.js

// ==/UserScript==

// original author 1110101, https://gitlab.com/1110101/opr-tools/graphs/master
// original source https://gitlab.com/1110101/opr-tools
// merge-requests welcome

/*
 MIT License

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.

 */

const PORTAL_MARKER = "data:image/PNG;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAABGdBTUEAALGPC/xhBQAAAAZiS0dEAP8A/wD/oL2nkwAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAAd0SU1FB+EHEAccLVUS/qUAAAI0SURBVDjLldTNa55VEAXw39zniTGRqvEDUqOLiEGKKEELbcS9IG79AxSJqCju3MZ/oNhFwFZtEZeKS1FKXRgRLVK6qSVoGkWbCkbRlHy8b/I+46K3sYg1eJZ35p4599yZCf9AfoH3NQZuUrRCCzo72NHo6xnESRJR77WQs8TxevKeceEx4TCmpEkQfsCSzleGfJOsBPIZ4oO/CeULijCGV3RekkaEgnItReqETbyt86ZFq7Gg21VU0yZ1jgozGBbOS5eE1Upyl3APHpJeVBx0wGsWfAuRiVkTilnpdfwpfC19h560U3W3OkMaUzqHhDuFI1rz5v3UzK1r9T0pvSHcjNM4j00MhHTV14GwjVVsCFPSI9IFj1os1tyCGaGVzgoXse3G2MEyzgpFelyxrwjDeBADLEtb9kLoScvoC5PCSJGG8QA6rEgDe6MTLmNLZ0XqlWpk4/8j0QqHdG4t1cCfhcDYdX3zXxSBO6qAdY1BMaQvLUkN7q1NuJdHRZpAK32PzeJ36zhT60zjvj2e2mBCmK7FzwhXio/0tT4XPsbdmKnVyr8oCezHDMYVp7Q+86uNNjZlXrJowryBg7hfGJXOKS7r/FZJxqT9mMa4dBFvCRfiQxnXpjdfNWrLE3gWT0sbdUB7Vc8wRjAqfKpzQmch3nUlZ+v058vE/O4WeBhPSYdrf01Woh+lJXyp+CSOOQf5PPHOdWtk92efU4zYZ9s4bpduq6E16Q+NX7AWx3Q5R8xdDf4FFQPK0NE5za8AAAAASUVORK5CYII=";
function addGlobalStyle(css) {
    let head, style;
    head = document.getElementsByTagName("head")[0];
    if (!head) {
        return;
    }
    style = document.createElement("style");
    style.type = "text/css";
    style.innerHTML = css;
    head.appendChild(style);
}


function init() {
    const w = typeof unsafeWindow === "undefined" ? window : unsafeWindow;
    let tryNumber = 5;
    const initWatcher = setInterval(function () {
        if (tryNumber === 0) {
            clearInterval(initWatcher);
            w.document.getElementById("NewSubmissionController").insertAdjacentHTML("afterBegin", `
<div class='alert alert-danger'><strong><span class='glyphicon glyphicon-remove'></span> OPR tools initialization failed,</strong> check developer console for error details</div>
`);
            return;
        }
        if (w.angular) {
            let err = false;
            try {
                initAngular();
                clearInterval(initWatcher);
            }
            catch (error) {
                err = error;
                console.log(error);
            }
            if (!err) {
                try {
                    initScript();
                } catch (error) {
                    console.log(error);
                }
            }
        }
        tryNumber--;
    }, 500);

    function initAngular() {
        const el = w.document.querySelector("[ng-app='portalApp']");
        w.$app = w.angular.element(el);
        w.$injector = w.$app.injector();
        w.$rootScope = w.$app.scope();

        w.$scope = function (element) {
            return w.angular.element(element).scope();
        };
    }

    function initScript() {
        const descDiv = document.getElementById("descriptionDiv");
        const ansController = w.$scope(descDiv).answerCtrl;
        const subController = w.$scope(descDiv).subCtrl;
        const scope = w.$scope(descDiv);
        const pageData = subController.pageData;
        let watchAdded = false;

        // run on init
        modifyPage();

        if (!watchAdded) {
            // re-run on data change
            scope.$watch("subCtrl.pageData", function () {
                modifyPage();
            });
        }

        function modifyPage() {

            // adding CSS
            addGlobalStyle(`
.dropdown {
position: relative;
display: inline-block;
}

.dropdown-content {
display: none;
position: absolute;
z-index: 1;
margin: 0;
}
.dropdown-menu li a {
color: #ddd !important;
}
.dropdown:hover .dropdown-content {
display: block;
background-color: #004746 !important;
border: 1px solid #0ff !important;
border-radius: 0px !important;

}
.dropdown-menu>li>a:focus, .dropdown-menu>li>a:hover {
background-color: #008780;
}
.modal-sm {
width: 350px !important;
}
.textButton{
color:#00FFFF;
}
`);


            // adding map buttons
            const wgs_lat = pageData.lat;
            const wgs_lng = pageData.lng;
            const name = pageData.title;
            const _gcj = coordtransform.wgs84togcj02(wgs_lng, wgs_lat);
            const gcj_lat = _gcj[1];
            const gcj_lng = _gcj[0];
            const _bd = coordtransform.gcj02tobd09(gcj_lng, gcj_lat);
            const bd_lat = _bd[1];
            const bd_lng = _bd[0];
            const mapButtons = [
                "<a class='button btn btn-default' target='intel' href='https://www.ingress.com/intel?ll=" + wgs_lat + "," + wgs_lng + "&z=17'>Intel</a>",
                "<a class='button btn btn-default' target='osm' href='https://www.openstreetmap.org/?mlat=" + wgs_lat + "&mlon=" + wgs_lng + "&zoom=16'>OSM</a>",
                "<a class='button btn btn-default' target='baidu' href='http://api.map.baidu.com/marker?location=" + wgs_lat + "," + wgs_lng + "&title=" + name + "&content=OPR_Candidate&output=html&coord_type=wgs84&src=OPR'>Baidu</a>",
                "<a class='button btn btn-default' target='tencent' href='http://apis.map.qq.com/uri/v1/marker?&marker=coord:" + gcj_lat + "," + gcj_lng + ";title:" + name + ";addr:&referer=OPR'>Tencent</a>",
                "<a class='button btn btn-default' target='baidu-streetview' href='http://api.map.baidu.com/pano/?x=" + bd_lat + "&y=" + bd_lng + "&lc=0&ak=ngDX6G7TgWSmjMstxolm7g642F7eUbkS'>Baidu StreetView</a>"
            ];
            descDiv.insertAdjacentHTML("beforeEnd", "<div><div class='btn-group'>" + mapButtons.join("") + "</div></div>");


            const textBox = w.document.querySelector("#submitDiv + .text-center > textarea");
            // moving submit button to right side of classification-div
            const submitDiv = w.document.querySelectorAll("#submitDiv, #submitDiv + .text-center");
            const classificationRow = w.document.querySelector(".classification-row");
            const newSubmitDiv = w.document.createElement("div");
            newSubmitDiv.className = "col-xs-12 col-sm-6";
            submitDiv[0].style.marginTop = 16;
            newSubmitDiv.appendChild(submitDiv[1]);
            newSubmitDiv.appendChild(submitDiv[0]);
            classificationRow.insertAdjacentElement("afterend", newSubmitDiv);


            // adding text buttons
            const selectButtonsDiv = w.document.createElement("div");
            const textButtons = [
                "<button id='photo' rate='1' class='button btn btn-default textButton' data-tooltip='indicates a low quality photo'>Bad Photo</button>",
                "<button id='private' rate='1' class='button btn btn-default textButton' data-tooltip='located on private residential property'>Private Area</button>",
                "<button id='duplicate' rate='1' class='button btn btn-default textButton' data-tooltip='duplicate of one you have previously reviewed'>Duplicate</button>",
                "<button id='school' rate='1' class='button btn btn-default textButton' data-tooltip='located on school property'>School</button>",
                "<button id='face' rate='1' class='button btn btn-default textButton' data-tooltip='photo contains 1 or more people faces'>Face</button>",
                "<button id='temporary' rate='1' class='button btn btn-default textButton' data-tooltip='seasonal or temporary display or item'>Temporary</button>",
                "<button id='location' rate='1' class='button btn btn-default textButton' data-tooltip='location wrong'>Location</button>",
                "<button id='agent' rate='1' class='button btn btn-default textButton' data-tooltip='agent name or codename in portal title/description'>Name In Title</button>",
            ];

            descDiv.insertAdjacentElement("beforeEnd", selectButtonsDiv);
            // more uncommon ratings (following the niantic guideline) in a dropdown menu
            const uncommonRatingsDropDown = [
                "<li>1 Star</li>",
                "<li><div id='apartment' rate='1' class='textButton' data-tooltip='agent name or codename in portal title/description'>Apartment Sign</div> </li>",
                "<li><div id='cemetery' rate='1' class='textButton' data-tooltip='agent name or codename in portal title/description'>Cemetery</div> </li>",
                "<li><div id='street_sign' rate='1' class='textButton' data-tooltip='agent name or codename in portal title/description'>City/Street Sign</div> </li>",
                "<li><div id='fire_dept' rate='1' class='textButton' data-tooltip='agent name or codename in portal title/description'>Fire Department</div> </li>",
                "<li><div id='hospital' rate='1' class='textButton' data-tooltip='agent name or codename in portal title/description'>Hospital</div> </li>",
                "<li><div id='hotel' rate='1' class='textButton' data-tooltip='agent name or codename in portal title/description'>Hotel/Inn</div> </li>",

                "<li role='separator' class='divider'></li>",
                "<li>3 Star</li>",
                "<li><div id='exercise' rate='3' class='textButton' data-tooltip='agent name or codename in portal title/description'>Exercise Equipment</div> </li>",

                "<li role='separator' class='divider'></li>",
                "<li>4 Star</li>",
                "<li><div id='post' rate='4' class='textButton' data-tooltip='agent name or codename in portal title/description'>Post Office</div> </li>",
                "<li><div id='survey_marker' rate='4' class='textButton' data-tooltip='agent name or codename in portal title/description'>Survey Marker</div> </li>",
                "<li><div id='water_tower' rate='4' class='textButton' data-tooltip='agent name or codename in portal title/description'>Water Tower</div> </li>",

                "<li role='separator' class='divider'></li>",
                "<li>5 Star</li>",
                "<li><div id='fountain' rate='5' class='textButton' data-tooltip='agent name or codename in portal title/description'>Fountain</div> </li>",
                "<li><div id='gazebo' rate='5' class='textButton' data-tooltip='agent name or codename in portal title/description'>Gazebo</div> </li>",
                "<li><div id='mt_marker' rate='5' class='textButton' data-tooltip='agent name or codename in portal title/description'>Mountain Top Marker</div> </li>",
                "<li><div id='playground' rate='5' class='textButton' data-tooltip='agent name or codename in portal title/description'>Playground</div> </li>",
                "<li><div id='ruin' rate='5' class='textButton' data-tooltip='agent name or codename in portal title/description'>Ruin</div> </li>",
                "<li><div id='trail_marker' rate='5' class='textButton' data-tooltip='agent name or codename in portal title/description'>Trail Marker</div> </li>",

            ];

            selectButtonsDiv.insertAdjacentHTML("beforeEnd", "<div class='btn-group' style='text-align: center'>" + textButtons.join("") +
                "<div class='button btn btn-primary dropdown'><span class='caret'></span><ul class='dropdown-content dropdown-menu'>" + uncommonRatingsDropDown.join("") + "</div>");

            function rateScore(star) {
                console.log(star - 1);
                w.document.querySelectorAll('.btn-group')[currentSelectable + 2].querySelectorAll('button.button-star')[star - 1].click();
                if (currentSelectable === 0 && star === 1)
                    currentSelectable = 0;
                else
                    currentSelectable++;
            }

            const buttons = w.document.getElementsByClassName("textButton");
            for (let b in buttons) {
                if (buttons.hasOwnProperty(b)) {
                    buttons[b].addEventListener("click", function () {

                        const source = event.target || event.srcElement;
                        let text;
                        switch (source.id) {
                            case "photo":
                                text = "Low quality photo";
                                break;
                            case "private":
                                text = "Private residential property";
                                break;
                            case "duplicate":
                                text = "Duplicate of previously reviewed portal candidate";
                                break;
                            case "school":
                                text = "Located on primary or secondary school grounds";
                                break;
                            case "face":
                                text = "Picture contains one or more clear faces";
                                break;
                            case "temporary":
                                text = "Portal candidate is seasonal or temporary";
                                break;
                            case "location":
                                text = "Portal candidate's location is not on object";
                                break;
                            case "agent":
                                text = "Title or description contains agent name";
                                break;
                            default:
                                text = "";
                                alert('Not implemented yet, DO NOT USE');
                                return;

                        }
                        if (source.hasAttribute('rate'))
                            rateScore(parseInt(source.getAttribute('rate')));
                        textBox.innerText = text;

                    }, false);
                }
            }


            // adding percent procressed number
            const stats = w.document.querySelector("#player_stats").children[2];

            const reviewed = parseInt(stats.children[3].children[2].innerText);
            const accepted = parseInt(stats.children[5].children[2].innerText);
            const rejected = parseInt(stats.children[7].children[2].innerText);

            let percent = (accepted + rejected) / reviewed;
            percent = Math.round(percent * 1000) / 10;
            w.document.querySelector("#player_stats:not(.visible-xs) div p:last-child")
                .insertAdjacentHTML("afterEnd", '<br><p><span class="glyphicon glyphicon-info-sign ingress-gray pull-left"></span>' +
                    '<span style="margin-left: 5px;" class="ingress-mid-blue pull-left">Percent Processed</span> <span class="gold pull-right">' + percent + '%</span></p>');

            w.document.querySelector("#player_stats:not(.visible-xs) div p:last-child").insertAdjacentHTML("afterEnd", '<br><p><input style="width: 99%;" type="text" ' +
                'value="' + reviewed + ' / ' + (accepted + rejected ) + ' (' + accepted + '/' + rejected + ') / ' + percent + '%"/></p>');

            // kill autoscroll
            ansController.goToLocation = null;

            // portal image zoom button with "=s0"
            w.document.querySelector("#AnswersController .ingress-background").insertAdjacentHTML("beforeBegin",
                "<div style='position:absolute;float:left;'><a class='button btn btn-default' style='display:inline-block;' href='" + subController.pageData.imageUrl + "=s0' target='fullimage'><span class='glyphicon glyphicon-search' aria-hidden='true'></span></div>");

            // REMOVED
            // skip "Your analysis has been recorded." dialog and go directly to next review
            //exportFunction(function () {
            //    window.location.assign("/recon");
            //}, ansController, {defineAs: "openSubmissionCompleteModal"});

            // Make photo filmstrip scrollable
            const filmstrip = w.document.getElementById("map-filmstrip");

            function scrollHorizontally(e) {
                e = window.event || e;
                const delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
                filmstrip.scrollLeft -= (delta * 50); // Multiplied by 50
                e.preventDefault();
            }

            filmstrip.addEventListener("DOMMouseScroll", scrollHorizontally, false);
            filmstrip.addEventListener("mousewheel", scrollHorizontally, false);

            // Replace map markers with a nice circle
            for (let i = 0; i < subController.markers.length; ++i) {
                const marker = subController.markers[i];
                marker.setIcon(PORTAL_MARKER);
            }
            subController.map.setZoom(16);

            // Re-enabling scroll zoom
            subController.map.setOptions(cloneInto({scrollwheel: true}, w));

            // HACKY way to move portal rating to the right side
            const scorePanel = w.document.querySelector("div[class~='pull-right']");
            let nodesToMove = Array.from(w.document.querySelector("div[class='btn-group']").parentElement.children);
            nodesToMove = nodesToMove.splice(2, 6);
            nodesToMove.push(w.document.createElement("br"));
            for (let j = nodesToMove.length - 1; j >= 0; --j) {
                scorePanel.insertBefore(nodesToMove[j], scorePanel.firstChild);
            }

            // Bind click-event to Dup-Images-Filmstrip. result: a click to the detail-image the large version is loaded in another tab
            const imgDups = w.document.querySelectorAll("#map-filmstrip > ul > li > img");
            const clickListener = function () {
                w.open(this.src + "=s0", 'fulldupimage');
            };
            for (let imgSep in imgDups) {
                if (imgDups.hasOwnProperty(imgSep)) {
                    imgDups[imgSep].addEventListener("click", function () {
                        const imgDup = w.document.querySelector("#content > img");
                        imgDup.removeEventListener("click", clickListener);
                        imgDup.addEventListener("click", clickListener);
                        imgDup.setAttribute("style", "cursor: pointer;");
                    });
                }
            }

            // add translate buttons to title and description (if existing)
            const link = w.document.querySelector("#descriptionDiv a");
            const content = link.innerText.trim();
            let a = w.document.createElement("a");
            let span = w.document.createElement("span");
            span.className = "glyphicon glyphicon-book";
            span.innerHTML = " ";
            a.appendChild(span);
            a.className = "button btn btn-default pull-right";
            a.target = 'translate';
            a.style.padding = '0px 4px';
            a.href = "https://translate.google.com/#auto/zh-CN/" + content;
            link.insertAdjacentElement("afterend", a);

            const description = w.document.querySelector("#descriptionDiv").innerHTML.split("<br>")[3].trim();
            if (description !== '&lt;No description&gt;' && description !== '') {
                a = w.document.createElement('a');
                span = w.document.createElement("span");
                span.className = "glyphicon glyphicon-book";
                span.innerHTML = " ";
                a.appendChild(span);
                a.className = "button btn btn-default pull-right";
                a.target = 'translate';
                a.style.padding = '0px 4px';
                a.href = "https://translate.google.com/#auto/zh-CN/" + description;
                const br = w.document.querySelectorAll("#descriptionDiv br")[2];
                br.insertAdjacentElement("afterend", a);
            }

            // Automatically open the first listed possible duplicate
            try {
                const e = w.document.querySelector("#map-filmstrip > ul > li:nth-child(1) > img");
                setTimeout(function () {
                    e.click();
                }, 500);
            } catch (err) {
            }

            // expand automatically the "What is it?" filter text box
            try {
                const f = w.document.querySelector("#AnswersController > form > div:nth-child(5) > div > p > span.ingress-mid-blue.text-center");
                setTimeout(function () {
                    f.click();
                }, 500);
            } catch (err) {
            }


            // keyboard navigation
            // keys 1-5 to vote
            // space/enter to confirm dialogs
            // esc or numpad "/" to reset selector
            // Numpad + - to navigate

            let currentSelectable = 0;
            let maxItems = 6;

            function highlight() {
                w.document.querySelectorAll('.btn-group').forEach(exportFunction((element) => {
                    element.style.border = 'none';
                }, w));
                if (currentSelectable < maxItems) {
                    w.document.querySelectorAll('.btn-group')[currentSelectable + 2].style.border = cloneInto('1px dashed #ebbc4a', w);
                }
            }

            addEventListener('keydown', (event) => {

                /*
                 keycodes:

                 8: Backspace
                 9: TAB
                 13: Enter
                 16: Shift
                 27: Escape
                 32: Space
                 107: NUMPAD +
                 109: NUMPAD -
                 111: NUMPAD /

                 49 - 53:  Keys 1-5
                 97 - 101: NUMPAD 1-5

                 */

                if (event.keyCode >= 49 && event.keyCode <= 53)
                    numkey = event.keyCode - 48;
                else if (event.keyCode >= 97 && event.keyCode <= 101)
                    numkey = event.keyCode - 96;
                else
                    numkey = null;

                if (w.document.querySelector("input[type=text]:focus") || w.document.querySelector("textarea:focus")) {
                    return;
                }
                // "analyze next" button
                else if ((event.keyCode === 13 || event.keyCode === 32) && w.document.querySelector('a.button[href="/recon"]')) {
                    w.document.location.href = '/recon';
                    event.preventDefault();
                } // submit low quality rating
                else if ((event.keyCode === 13 || event.keyCode === 32) && w.document.querySelector('[ng-click="answerCtrl2.confirmLowQuality()"]')) {
                    w.document.querySelector('[ng-click="answerCtrl2.confirmLowQuality()"]').click();
                    currentSelectable = 0;
                    event.preventDefault();

                } // submit duplicate
                else if ((event.keyCode === 13 || event.keyCode === 32) && w.document.querySelector('[ng-click="answerCtrl2.confirmDuplicate()"]')) {
                    w.document.querySelector('[ng-click="answerCtrl2.confirmDuplicate()"]').click();
                    currentSelectable = 0;
                    event.preventDefault();

                } // submit normal rating
                else if ((event.keyCode === 13 || event.keyCode === 32) && currentSelectable === maxItems) {
                    w.document.querySelector('[ng-click="answerCtrl.submitForm()"]').click();
                    event.preventDefault();

                } // close duplicate dialog
                else if ((event.keyCode === 27 || event.keyCode === 111) && w.document.querySelector('[ng-click="answerCtrl2.resetDuplicate()"]')) {
                    w.document.querySelector('[ng-click="answerCtrl2.resetDuplicate()"]').click();
                    currentSelectable = 0;
                    event.preventDefault();

                } // close low quality ration dialog
                else if ((event.keyCode === 27 || event.keyCode === 111) && w.document.querySelector('[ng-click="answerCtrl2.resetLowQuality()"]')) {
                    w.document.querySelector('[ng-click="answerCtrl2.resetLowQuality()"]').click();
                    currentSelectable = 0;
                    event.preventDefault();
                }
                // return to first selection (should this be a portal)
                else if (event.keyCode === 27 || event.keyCode === 111) {
                    currentSelectable = 0;
                }
                // select next rating
                else if ((event.keyCode === 107 || event.keyCode === 9) && currentSelectable < maxItems) {
                    currentSelectable++;
                    event.preventDefault();
                }
                // select previous rating
                else if ((event.keyCode === 109 || event.keyCode === 16 || event.keyCode === 8) && currentSelectable > 0) {
                    currentSelectable--;
                    event.preventDefault();

                }
                else if (numkey === null || currentSelectable >= maxItems) {
                    return;
                }
                // rating 1-5
                else {
                    rateScore(numkey);
                }
                highlight();
            });

            highlight();

            watchAdded = true;
        }

    }

}

window.addEventListener('load', function () {
    if (document.querySelector("[src*='all-min']")) {
        init();
    }
}, false);

