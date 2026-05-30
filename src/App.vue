<template>
  <div class="app-container">
    <!-- 顶部状态栏 -->
    <div style="background-color: #fff; padding: 10px 16px; border-bottom: 1px solid #ebedf0; display: flex; align-items: center; justify-content: space-between;">
      <span style="font-weight: bold; font-size: 16px;">🔥 IELTS--Successful for me</span>
      <div style="display: flex; gap: 4px; align-items: center;">
        <span style="font-size: 12px; color: #999; margin-right: 5px;">打卡</span>
        <div v-for="(day, index) in last7Days" :key="index" 
             :style="{ width: '16px', height: '16px', borderRadius: '3px', backgroundColor: studyRecords.includes(day) ? '#39d353' : '#ebedf0' }">
        </div>
      </div>
    </div>

    <!-- ==================== 模块一：阅读特训 ==================== -->
    <div v-show="activeTab === 0" style="padding-bottom: 60px;">
      
      <!-- 错题本与 Flashcard -->
      <div v-if="isReadingNotebookMode">
        <van-nav-bar left-text="返回" left-arrow @click-left="isReadingNotebookMode = false" />
        <div style="padding: 10px 16px; display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin:0;">📚 我的错题本</h3>
          <van-switch v-model="hideMeaning" size="20px" active-color="#ee0a24" />
        </div>
        
        <!-- 标签筛选器 -->
        <div style="padding: 0 16px 10px; display: flex; gap: 8px; overflow-x: auto; white-space: nowrap;">
          <van-tag :type="activeFilterTag === '' ? 'primary' : 'default'" size="medium" @click="activeFilterTag = ''">全部</van-tag>
          <van-tag v-for="t in tagOptions" :key="t" :type="activeFilterTag === t ? 'primary' : 'default'" size="medium" @click="activeFilterTag = t">{{ t }}</van-tag>
        </div>

        <van-cell-group inset>
          <van-cell v-if="filteredStarredWords.length === 0" title="该分类下没有错题！" />
          <van-cell v-for="word in filteredStarredWords" :key="word.id" :title="word.word">
            <template #label>
              <!-- 遮挡释义逻辑 -->
              <div v-if="!hideMeaning" style="color: #999; margin-bottom: 4px;">{{ word.meaning }}</div>
              <div v-else style="color: #ccc; font-style: italic; text-decoration: underline; margin-bottom: 4px;" @click="word.showTemp = !word.showTemp">
                {{ word.showTemp ? word.meaning : '点击查看释义' }}
              </div>
              <!-- 显示标签 -->
              <div v-if="word.mistake_tag" style="margin-top: 4px;">
                <van-tag plain type="danger">{{ word.mistake_tag }}</van-tag>
              </div>
            </template>
            <template #right-icon>
              <div style="display:flex; align-items:center; gap: 15px;">
                <van-icon name="volume-o" size="20" color="#1989fa" @click="speak(word.word)" />
                <van-icon name="star" size="20" color="#ee0a24" @click="removeStar(word)" />
              </div>
            </template>
          </van-cell>
        </van-cell-group>
      </div>

      <!-- 主控制台 -->
      <div class="control-panel" v-else-if="!isPracticing">
        <div style="margin: 20px 16px;">
          <van-button icon="star-o" type="danger" plain block @click="isReadingNotebookMode = true" style="margin-bottom: 15px;">错题本 ({{ starredWords.length }})</van-button>
          <van-uploader accept=".csv" :max-count="1" :after-read="handleFileUpload" style="width: 100%;"><van-button icon="description" type="primary" plain block>上传词书</van-button></van-uploader>
          <van-button type="success" block round style="margin-top: 30px;" @click="startPractice" :disabled="readingWords.length < 4">极限 25 秒特训！</van-button>
        </div>
      </div>

      <!-- 极限25秒刷题页面 -->
      <div class="content" v-else>
        <div class="score-board"><span>得分: {{ score }}</span><span style="color:#1989fa; cursor:pointer;" @click="exitPractice">退出</span></div>
        
        <!-- 核心新增：25秒倒计时进度条 -->
        <div style="margin-bottom: 15px; position: relative;">
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px; color: #666;">
            <span>反应速度挑战 (剩 0 秒判错)</span>
            <span :style="{ color: timeLeft <= 5 ? '#ee0a24' : '#666', fontWeight: timeLeft <= 5 ? 'bold' : 'normal' }">{{ timeLeft.toFixed(1) }}s</span>
          </div>
          <div style="width: 100%; height: 8px; background: #ebedf0; border-radius: 4px; overflow: hidden;">
            <div :style="{ width: (timeLeft / 25 * 100) + '%', height: '100%', backgroundColor: timeLeft > 10 ? '#07c160' : (timeLeft > 5 ? '#ff976a' : '#ee0a24'), transition: 'width 0.1s linear, background-color 0.3s' }"></div>
          </div>
        </div>

        <van-cell-group inset class="question-card" v-if="currentQuestion">
          <div class="word-display"><h2>{{ currentQuestion.word }}</h2><van-icon name="volume-o" size="24" @click="speak(currentQuestion.word)" style="color:#1989fa; margin-left: 10px;" /></div>
          <p style="text-align: center; color: #999; margin: 0 0 10px 0;">{{ currentQuestion.meaning }}</p>
          <div class="options-list">
            <van-button v-for="(opt, index) in currentOptions" :key="index" block class="option-btn" :type="getButtonType(opt.text)" @click="handleSelect(opt.text)" :disabled="hasAnswered">
              <span class="option-text">{{ opt.text }}</span><span v-if="hasAnswered" class="option-meaning">{{ opt.meaning }}</span>
            </van-button>
          </div>
        </van-cell-group>
        
        <div v-if="hasAnswered" class="action-area" style="padding: 16px;">
          <van-notice-bar :text="isTimeout ? '⏰ 时间到！犹豫就会败北！' : (isCorrect ? '正确！' : '错误！正确选项: ' + (currentQuestion.synonym || currentQuestion.word))" 
            :color="isCorrect && !isTimeout ? '#07c160' : '#ee0a24'" :background="isCorrect && !isTimeout ? '#e8fbec' : '#ffe1e1'" style="border-radius: 8px; margin-bottom: 10px;" />
          
          <div style="display: flex; gap: 10px;">
            <van-button v-if="(!isCorrect || isTimeout) && !currentQuestion.is_starred" icon="star-o" type="danger" plain block round @click="openTagSelector(currentQuestion)">加入错题</van-button>
            <van-button type="primary" block round @click="nextQuestion">下一题</van-button>
          </div>
        </div>
      </div>
    </div>

    <!-- =============== 听力与精听模块完全保留原样 ================= -->
    <div v-show="activeTab === 1" style="padding-bottom: 60px;">
      <div v-if="!isListeningMode">
        <div style="margin: 20px 16px;"><van-uploader accept=".csv" :max-count="1" :after-read="handleFileUpload" style="width: 100%;"><van-button icon="description" type="success" plain block>上传听力</van-button></van-uploader></div>
        <van-cell-group inset style="margin:0;"><van-cell v-for="(mod, index) in listeningModules" :key="index" :title="'Module ' + (index+1)" :label="mod.dateRange" is-link @click="startListeningModule(mod.words)"/></van-cell-group>
      </div>
      <div class="content" v-else-if="isListeningPracticing">
        <div class="score-board"><span>进度: {{ listeningIndex + 1 }} / {{ listeningCurrentModule.length }}</span><span style="color:#1989fa; cursor:pointer;" @click="exitListening">退出</span></div>
        <van-cell-group inset class="question-card" style="text-align: center; padding-top: 15px;">
          <div style="padding: 20px 0;"><van-icon name="play-circle" size="64" color="#07c160" @click="playListeningWord" /></div>
          <van-field v-model="listeningInput" placeholder="在此拼写..." input-align="center" size="large" style="background: #f7f8fa; border-radius: 8px; margin-bottom: 20px;" @keyup.enter="nextListeningWord" />
          <van-button type="success" block round @click="nextListeningWord">下一词</van-button>
        </van-cell-group>
      </div>
      <div class="content" v-else-if="isListeningFinished">
        <van-cell-group inset title="错题复盘"><div v-for="(item, index) in listeningMistakes" :key="index" style="padding: 10px; border-bottom: 1px solid #eee;">
          <div>拼写: <span v-html="item.diffHtml"></span></div><div style="color: #07c160;">正确: {{ item.correctWord }}</div>
        </div></van-cell-group>
        <van-button type="primary" block round @click="exitListening" style="margin-top:20px;">返回列表</van-button>
      </div>
    </div>
    
    <div v-show="activeTab === 2" style="padding-bottom: 60px;">
      <div v-if="!intensiveMode">
        <div style="margin: 20px 16px;"><van-uploader accept=".csv" :max-count="1" :after-read="handleFileUpload" style="width: 100%;"><van-button icon="description" type="warning" plain block>上传长难句</van-button></van-uploader></div>
        <van-cell-group inset><van-cell v-for="item in intensiveWords" :key="item.id" :title="item.word" is-link @click="openIntensiveItem(item)" /></van-cell-group>
      </div>
      <div class="content" v-else>
        <van-nav-bar left-text="返回" left-arrow @click-left="intensiveMode = false" />
        <van-cell-group inset style="padding: 20px 16px;">
          <p>{{ currentIntensiveItem.word }}</p>
          <div style="display: flex; justify-content: space-around; margin: 20px 0;"><van-button @click="speak(currentIntensiveItem.word, 0.75, 'uk')">0.75x</van-button><van-button icon="play-circle" type="warning" @click="speak(currentIntensiveItem.word, 1.0, 'uk')">1.0x</van-button></div>
          <van-field v-model="intensiveNoteInput" type="textarea" placeholder="笔记..." /><van-button type="warning" block @click="saveNote">保存</van-button>
        </van-cell-group>
      </div>
    </div>

    <!-- 核心新增：错题标签选择器弹窗 (不需要动数据库，借用 note 字段或直接存在本地数组) -->
    <van-action-sheet v-model:show="showTagSelector" title="为错题打个标签吧" cancel-text="取消" @cancel="showTagSelector = false">
      <div style="padding: 20px 16px; display: flex; flex-direction: column; gap: 10px;">
        <van-button v-for="tag in tagOptions" :key="tag" type="primary" plain block @click="confirmTag(tag)">
          {{ tag }}
        </van-button>
      </div>
    </van-action-sheet>

    <van-tabbar v-model="activeTab" active-color="#1989fa"><van-tabbar-item icon="flag-o">阅读特训</van-tabbar-item><van-tabbar-item icon="service-o">听力默写</van-tabbar-item><van-tabbar-item icon="records">长难句</van-tabbar-item></van-tabbar>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { showToast, showLoadingToast, closeToast } from 'vant'
import { supabase } from './supabase'
import Papa from 'papaparse'

const activeTab = ref(0)
const readingWords = ref([]); const listeningWords = ref([]); const intensiveWords = ref([])

// 打卡系统
const studyRecords = ref(JSON.parse(localStorage.getItem('study_days') || '[]'))
const last7Days = computed(() => Array.from({length: 7}, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6-i)); return d.toISOString().split('T')[0] }))
const recordStudyToday = () => { const today = new Date().toISOString().split('T')[0]; if (!studyRecords.value.includes(today)) { studyRecords.value.push(today); localStorage.setItem('study_days', JSON.stringify(studyRecords.value)) } }

// 阅读模块与25秒系统
const isPracticing = ref(false); const isReadingNotebookMode = ref(false); const hideMeaning = ref(false)
const score = ref(0); const currentQuestion = ref(null); const currentOptions = ref([])
const hasAnswered = ref(false); const isCorrect = ref(false)

// 错题标签系统 (借用本地存储组合，不改数据库)
const tagOptions = ['同义替换没看懂', '没找到定位', '长难句卡住', '题型策略错', '单词没想起']
const showTagSelector = ref(false)
const wordToTag = ref(null)
const activeFilterTag = ref('')
const localTags = ref(JSON.parse(localStorage.getItem('mistake_tags') || '{}'))

const starredWords = computed(() => {
  return readingWords.value.filter(w => w.is_starred).map(w => ({
    ...w, mistake_tag: localTags.value[w.id] || null
  }))
})
const filteredStarredWords = computed(() => {
  if (!activeFilterTag.value) return starredWords.value
  return starredWords.value.filter(w => w.mistake_tag === activeFilterTag.value)
})

const openTagSelector = (w) => { wordToTag.value = w; showTagSelector.value = true }
const confirmTag = async (selectedTag) => {
  const w = wordToTag.value; showTagSelector.value = false
  await supabase.from('words').update({ is_starred: true }).eq('id', w.id)
  w.is_starred = true
  localTags.value[w.id] = selectedTag // 存本地，免去建字段
  localStorage.setItem('mistake_tags', JSON.stringify(localTags.value))
  showToast('⭐ 成功收录分类错题！')
}
const removeStar = async (w) => {
  await supabase.from('words').update({ is_starred: false }).eq('id', w.id)
  w.is_starred = false; showToast('已移出错题本')
}

// 25秒倒计时逻辑
const timeLeft = ref(25.0); const isTimeout = ref(false); let timerInterval = null
const startTimer = () => {
  clearInterval(timerInterval); timeLeft.value = 25.0; isTimeout.value = false
  timerInterval = setInterval(() => {
    timeLeft.value -= 0.1
    if (timeLeft.value <= 0) { clearInterval(timerInterval); timeLeft.value = 0; handleTimeout() }
  }, 100)
}
const handleTimeout = () => { if (hasAnswered.value) return; hasAnswered.value = true; isTimeout.value = true; isCorrect.value = false }

const startPractice = () => { isPracticing.value = true; score.value = 0; nextQuestion(); recordStudyToday() }
const nextQuestion = () => {
  hasAnswered.value = false; isTimeout.value = false;
  const q = readingWords.value[Math.floor(Math.random() * readingWords.value.length)]; currentQuestion.value = q
  let pool = [{ text: q.synonym || q.word, meaning: q.meaning }]
  while (pool.length < 4) {
    const f = readingWords.value[Math.floor(Math.random() * readingWords.value.length)]
    if (!pool.find(o => o.text === (f.synonym || f.word))) pool.push({ text: f.synonym || f.word, meaning: f.meaning })
  }
  currentOptions.value = pool.sort(() => Math.random() - 0.5); speak(q.word); startTimer()
}

const handleSelect = (text) => {
  if (hasAnswered.value) return; clearInterval(timerInterval); hasAnswered.value = true
  isCorrect.value = (text === (currentQuestion.value.synonym || currentQuestion.value.word))
  if (isCorrect.value) score.value++; speak(text)
}
const getButtonType = (text) => {
  if (!hasAnswered.value) return 'default'
  if (text === (currentQuestion.value.synonym || currentQuestion.value.word)) return 'success'
  return 'danger'
}
const exitPractice = () => { clearInterval(timerInterval); isPracticing.value = false }

// 听力等其他原封不动（节约篇幅）
const isListeningMode = ref(false); const isListeningPracticing = ref(false); const isListeningFinished = ref(false); const listeningCurrentModule = ref([]); const listeningIndex = ref(0); const listeningInput = ref(''); const listeningResults = ref([]); const listenSpeed = ref(1.0); const autoReplay = ref(false); let replayTimer = null
const currentListeningWord = computed(() => listeningCurrentModule.value[listeningIndex.value])
const playListeningWord = () => { speak(currentListeningWord.value.word, listenSpeed.value, 'mixed'); clearTimeout(replayTimer); if(autoReplay.value && isListeningPracticing.value) replayTimer = setTimeout(playListeningWord, 5000) }
const startListeningModule = (w) => { listeningCurrentModule.value = [...w].sort(()=>Math.random()-0.5); isListeningMode.value=true; isListeningPracticing.value=true; listeningIndex.value=0; listeningResults.value=[]; listeningInput.value=''; recordStudyToday(); setTimeout(playListeningWord,500) }
const nextListeningWord = () => { clearTimeout(replayTimer); const r = listeningInput.value.trim().toLowerCase()===currentListeningWord.value.word.toLowerCase(); listeningResults.value.push({correctWord:currentListeningWord.value.word, userInput:listeningInput.value, meaning:currentListeningWord.value.meaning, isRight:r, diffHtml: r?listeningInput.value:`<span style="color:#ee0a24">${listeningInput.value||'(空)'}</span>`}); listeningIndex.value++; listeningInput.value=''; if(listeningIndex.value>=listeningCurrentModule.value.length){isListeningPracticing.value=false; isListeningFinished.value=true} else playListeningWord() }
const listeningMistakes = computed(()=>listeningResults.value.filter(r=>!r.isRight)); const exitListening = () => {clearTimeout(replayTimer); isListeningMode.value=false; isListeningPracticing.value=false; isListeningFinished.value=false}

// 精听及通用
const intensiveMode = ref(false); const currentIntensiveItem = ref(null); const intensiveNoteInput = ref('')
const openIntensiveItem = (i) => { currentIntensiveItem.value=i; intensiveNoteInput.value=i.note||''; intensiveMode.value=true; recordStudyToday() }
const saveNote = async () => { await supabase.from('words').update({note:intensiveNoteInput.value}).eq('id',currentIntensiveItem.value.id); currentIntensiveItem.value.note=intensiveNoteInput.value; showToast('保存成功') }
const fetchWordsCount = async () => { const {data} = await supabase.from('words').select('*'); if(data){ readingWords.value=data.filter(w=>w.category==='reading'||!w.category).map(w=>({...w,showTemp:false})); listeningWords.value=data.filter(w=>w.category==='listening'); intensiveWords.value=data.filter(w=>w.category==='intensive') } }
const listeningModules = computed(() => { const m={}; listeningWords.value.forEach(w=>{const d=new Date(w.created_at).toLocaleDateString(); if(!m[d])m[d]=[]; m[d].push(w)}); return Object.keys(m).map(d=>({dateRange:d, words:m[d]})) })
const handleFileUpload = (f) => { Papa.parse(f.file, {header:true, skipEmptyLines:true, complete:async(r)=>{await supabase.from('words').insert(r.data.map(x=>({...x, category:activeTab.value===0?'reading':(activeTab.value===1?'listening':'intensive')}))); fetchWordsCount(); showToast('上传成功')}}) }
const speak = (t, r=1.0, m='mixed') => { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.rate=r; const v=window.speechSynthesis.getVoices().filter(x=>x.lang.startsWith('en')); if(v.length) u.voice = m==='uk'?(v.find(x=>x.lang==='en-GB')||v[0]):v[Math.floor(Math.random()*v.length)]; window.speechSynthesis.speak(u) }
onMounted(() => fetchWordsCount()); onUnmounted(() => {clearInterval(timerInterval); clearTimeout(replayTimer)})
</script>

<style scoped>
.app-container { min-height: 100vh; background-color: #f2f3f5; }
.control-panel, .content { padding: 16px; }
.score-board { display: flex; justify-content: space-between; margin-bottom: 20px; font-weight: bold; }
.question-card { padding: 24px 16px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.word-display { display: flex; justify-content: center; align-items: center; margin-bottom: 5px; }
.word-display h2 { margin: 0; font-size: 28px; color: #333; }
.options-list { display: flex; flex-direction: column; gap: 12px; }
.option-btn { border-radius: 8px; height: auto; min-height: 54px; padding: 8px; }
.option-btn :deep(.van-button__text) { display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.4; white-space: normal;}
.option-text { font-size: 16px; font-weight: 500; }
.option-meaning { font-size: 13px; color: #666; margin-top: 4px; }
.action-area { margin-top: 24px; }
</style>