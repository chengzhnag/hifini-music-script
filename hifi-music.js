// ==UserScript==
// @name         hifini音乐播放管理
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  在HiFiNi网站自动播放歌曲，可以自定义播放列表
// @author       zs
// @license MIT
// @email        1772591173@qq.com
// @match        https://www.hifini.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=hifini.com
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  insetPanel();
  // 初始化 判断url是否有thread字符串，有的话是播放音乐页面，则自动播放
  // 没有的话是外层音乐列表页面，则在每个记录上insert'添加到播放列表按钮'
  init();
})();

function insetPanel() {
  // 播放音乐页面
  // if (location.href.indexOf('thread') !== -1) return;
  const body = document.getElementById('body');
  const panel = `
    <div style="position: fixed;top: 100px;left: 0;width: 240px;background: #b1cde4;border-bottom-right-radius: 5px;border-top-right-radius: 5px; padding: 6px 8px;font-size: 12px;z-index: 1001;">
      <div style="display: flex;align-items: center;justify-content: space-between;width: 100%;height: 30px;border-bottom: 1px solid #333;">
        <span id="start-auto-play-zs" style="color: #333;cursor: pointer;">开始自动播放</span>
        <span style="width: 1px;height: 8px;background: #333;"></span>
        <span id="clear-play-list-zs" style="color: #333;cursor: pointer;">清空播放列表</span>
      </div>
      <div id="diy-play-list" style="display: flex;flex-direction: column;max-height: 500px;">
        <span style="color: #000;">播放列表</span>
        <span style="color: #333;">播放列表暂无添加音乐</span>
      </div>
      <div id="tips-zs" style="color: #008cff;cursor: pointer;">
        关于进入音乐播放页面无法自动播放问题
      </div>
    </div>
  `;
  body ? body.insertAdjacentHTML('beforeend', panel) : '';
  setPlayList(getPlayList());
  setTimeout(() => {
    document.getElementById('start-auto-play-zs').addEventListener('click', () => {
      const data = getPlayList();
      if (Array.isArray(data) && data.length) {
        location.href = data[0].href;
        localStorage.setItem('play-list-index-zs', '0');
      } else {
        alert('请先去音乐列表添加音乐到播放列表');
        location.href = 'https://www.hifini.com';
      }
    })
    document.getElementById('clear-play-list-zs').addEventListener('click', () => {
      setPlayList([]);
    })
    document.getElementById('tips-zs').addEventListener('click', () => {
      alert(`由于浏览器策略不同，可能不允许脚本驱动媒体播放，可以手动点击播放音乐按钮，次数多了浏览器会记住你的选择，则脚本驱动媒体播放不会再失败。
        您也可以手动开启浏览器对声音的设置，将该网站设置为允许播放声音。`);
    })
  }, 400)
}

function init() {
  // 播放音乐页面
  if (location.href.indexOf('thread') !== -1) {
    setTimeout(() => {
      document.querySelector('.aplayer-icon-play').click();
      watchPlayEnd();
    }, 1000);
  } else { // 外层音乐列表页面
    try {
      const ulEle = Array.from(document.querySelector('.card-body').children[0].children).filter(i => i.tagName === 'LI');
      ulEle.forEach(it => {
        const mediaEle = getNodeByClassName(it.children, 'media-body');
        const subjectEle = getNodeByClassName(mediaEle.children, 'subject');
        const btnEle = document.createElement('button');
        btnEle.style = 'margin-left: 20px;cursor: pointer;';
        btnEle.innerHTML = '添加到播放列表';
        btnEle.setAttribute('data-href', subjectEle.children[0].href || '');
        btnEle.setAttribute('data-name', subjectEle.children[0].innerText || '');
        btnEle.addEventListener('click', (e) => {
          e.stopPropagation();
          const href = e.target.dataset.href;
          const name = e.target.dataset.name;
          const playList = getPlayList();
          if (playList.find(i => i.href === href)) return;
          playList.push({
            name,
            href
          })
          setPlayList(playList);
        })
        subjectEle.appendChild(btnEle);
      })
    } catch (error) {
      console.log("插入'添加到播放列表'按钮失败:", error);
      alert("插入'添加到播放列表'按钮失败");
    }
  }
}

function getPlayList() {
  const data = localStorage.getItem('hifini_play_list');
  try {
    return data ? JSON.parse(data) : [];
  } catch (error) {
    return [];
  }
}

function setPlayList(data) {
  localStorage.setItem('hifini_play_list', JSON.stringify(data));
  if (Array.isArray(data)) {
    const ele = document.getElementById('diy-play-list');
    ele.innerHTML = '<span style="color: #000;">播放列表</span>';
    const divEle = document.createElement('div');
    divEle.style = 'width: 100%;overflow-y: scroll;overflow-x: hidden;';
    let html = '';
    data.forEach((it, idx) => {
      html += `<div style="display: flex;height: 24px;align-items: center;">
        <span
          data-href="${it.href}"
          data-type="play"
          data-index="${idx}"
          style="overflow: hidden;width: 160px;word-break: break-all;white-space: nowrap;text-overflow: ellipsis;cursor: pointer;"
        >
          ${it.name}
        </span>
        <span data-href="${it.href}" data-type="del" data-index="${idx}" style="white-space: nowrap;color: #9a2121;cursor: pointer;margin-left: 4px;">删除</span>
        <span data-href="${it.href}" data-type="move-up" data-index="${idx}" style="white-space: nowrap;color: #9a2121;cursor: pointer;margin-left: 4px;">上移</span>
        <span data-href="${it.href}" data-type="move-down" data-index="${idx}" style="white-space: nowrap;color: #9a2121;cursor: pointer;margin-left: 4px;">下移</span>
      </div>
      `;
    })
    divEle.innerHTML = html;
    divEle.addEventListener('click', e => {
      const { type, href, index } = e.target.dataset;
      const list = getPlayList();
      if (type === 'play') { // 播放
        location.href = href;
        localStorage.setItem('play-list-index-zs', index);
      } else if (type === 'del') { // 删除
        list.splice(+index, 1);
        setPlayList(list);
      } else if (type === 'move-up') { // 上移
        if (+index) {
          const snap = list[+index];
          list[+index] = list[+index - 1];
          list[+index - 1] = snap;
          setPlayList(list);
        }
      } else if (type === 'move-down') { // 下移
        if (+index < list.length - 1) {
          const snap = list[+index];
          list[+index] = list[+index + 1];
          list[+index + 1] = snap;
          setPlayList(list);
        }
      }
    })
    ele.appendChild(divEle);
  }
  if (Array.isArray(data) && !data.length) {
    const ele = document.getElementById('diy-play-list');
    ele.innerHTML = '<span style="color: #000;">播放列表</span><span style="color: #333;">播放列表暂无添加音乐</span>';
  }
}

function getNodeByClassName(node, name) {
  for (let i = 0; i < node.length; i++) {
    if (node[i].className.split(' ').includes(name)) {
      return node[i];
    }
  }
}

// 监听播放完毕
function watchPlayEnd() {
  const url = location.href;
  const timer = setInterval(() => {
    if (url !== location.href) {
      clearInterval(timer);
    }
    try {
      const dtime = document.querySelector('.aplayer-dtime').innerText;
      const ptime = document.querySelector('.aplayer-ptime').innerText;
      if (dtime === '00:00' && ptime === '00:00') {
        return;
      }
      const end = dtime.split(':');
      const start = ptime.split(':');
      if (start[0] === end[0]) {
        if (start[1] === end[1] || Number(start[1]) === Number(end[1] - 1)) {
          clearInterval(timer);
          document.querySelector('.aplayer-icon-pause').click()
          const index = localStorage.getItem('play-list-index-zs');
          if (index) {
            const data = getPlayList();
            if (data.length === +index + 1) {
              location.href = data[0].href;
              localStorage.setItem('play-list-index-zs', '0');
              return;
            }
            location.href = data[+index + 1].href;
            localStorage.setItem('play-list-index-zs', +index + 1);
          }
        }
      }
    } catch (error) {
      clearInterval(timer);
    }
  }, 1000)
}
