// Bootstrap for the single-document build (one hosted link): home and
// editor markup live in one page and the stored view picks which runs.

import { editorParams } from "./store.js";

document.body.dataset.single = "1";
const inEditor = [...editorParams().keys()].length > 0;
document.body.classList.add(inEditor ? "editor" : "home");
document.getElementById(inEditor ? "home-view" : "editor-view")?.remove();
document.getElementById(inEditor ? "editor-view" : "home-view").hidden = false;
await import(inEditor ? "./editor.js" : "./home.js");
