<template>
  <div class="app-container">
    <van-nav-bar 
      :title="activeTab === 0 ? '📖 阅读特训' : (activeTab === 1 ? '🎧 听力默写' : '📝 长难句精听')" 
      style="background-color: #f7f8fa;" 
    />

    <!-- ==================== 模块一：阅读特训 (Reading) ==================== -->
    <div v-show="activeTab === 0" style="padding-bottom: 60px;">
      <div class="control-panel" v-if="!isPracticing">
        <van-notice-bar left-icon="info-o" :text="'当前阅读词库共有 ' + readingWords.length + ' 个单词'" />
        <div style="margin: 20px 16px;">
          <van-uploader accept=".csv" :max-count="1" :after-read="handleFileUpload">
            <van-button icon="description" type="primary" plain block>上传阅读词书 (CSV格式)</van-button>
          </van-uploader>
          <van-button icon="plus" type="primary" plain block style="margin-top: 15px;" @click="showAddDialog = true">
            手动录入阅读单词
          </van-button>
          <van-button type="success" block round style="margin-top: 30px;" @click="startPractice" :disabled="readingWords.length === 0">
            开始阅读刷题！
          </van-button>
        </div>
      </div>

      <div class="content" v-else>
        <div class="score-board">
          <span>当前得分: {{ score }}</span>
          <span style="color:#1989fa; cursor:pointer;" @click="isPracticing = false">退出练习</span>
        </div>
        <van-cell-group inset class="question-card" v-if="currentQuestion">
          <div class="word-display">
            <h2>{{ currentQuestion.word }}</h2>
            <van-icon name="volume-o" size="24" @click="speak(currentQuestion.word, 1, false)" style="color:#1989fa; margin-left: 10px;" />
          </div>
          <p style="text-align: center; color: #999; margin: 0 0 10px 0;">{{ currentQuestion.meaning }}</p>
          <p style="text-align: center; color: #666; margin-bottom: 20px; font-weight: bold;">请选择与上面单词意思相近的词</p>

          <div class="options-list">
            <van-button 
              v-for="(optionObj, index) in currentOptions" :key="index" block class="option-btn"
              :type="getButtonType(optionObj.text)" @click="handleSelect(optionObj.text)" :disabled="hasAnswered"
            >
              <span class="option-text">{{ optionObj.text }}</span>
              <span v-if="hasAnswered" class="option-meaning">{{ optionObj.meaning }}</span>
            </van-button>
          </div>
        </van-cell-group>
        <div v-if="hasAnswered" class="action-area" style="padding: 16px;">
          <van-notice-bar 
            :text="isCorrect ? '回答正确！🎉' : '回答错误。正确选项是: ' + (currentQuestion.synonym || currentQuestion.word)" 
            :color="isCorrect ? '#07c160' : '#ee0a24'" :background="isCorrect ? '#e8fbec' : '#ffe1e1'"
            style="margin-bottom: 20px; border-radius: 8px;"
          />
          <van-button type="primary" block round @click="nextQuestion">下一题</van-button>
        </div>
      </div>
    </div>

    <!-- ==================== 模块二：听力默写 (Listening) ==================== -->
    <div v-show="activeTab === 1" style="padding-bottom: 60px;">
      <div v-if="!isListeningMode">
        <van-notice-bar left-icon="service-o" :text="'当前听力词库共有 ' + listeningWords.length + ' 个单词'" />
        <div style="margin: 20px 16px;">
          <van-uploader accept=".csv" :max-count="1" :after-read="handleFileUpload">
            <van-button icon="description" type="success" plain block>上传听力词书 (CSV格式)</van-button>
          </van-uploader>
          <van-button icon="plus" type="success" plain block style="margin-top: 15px;" @click="showAddDialog = true">
            手动录入听力单词
          </van-button>
        </div>

        <div style="padding: 0 16px; margin-top: 20px;">
          <h3 style="color: #333; margin-bottom: 10px;">听写任务模块 (每2天一组)</h3>
          <van-cell-group inset style="margin:0;">
            <van-cell v-if="listeningModules.length === 0" title="暂无听写任务" />
            <van-cell 
              v-for="(mod, index) in listeningModules" :key="index" :title="'Module ' + (index + 1)" 
              :label="mod.dateRange + ' | 共 ' + mod.words.length + ' 词'" is-link @click="startListeningModule(mod.words)"
            />
          </van-cell-group>
        </div>
      </div>

      <div class="content" v-else-if="isListeningPracticing">
        <div class="score-board">
          <span>进度: {{ listeningIndex + 1 }} / {{ listeningCurrentModule.length }}</span>
          <span style="color:#1989fa; cursor:pointer;" @click="exitListening">放弃测验</span>
        </div>
        <van-cell-group inset class="question-card" style="text-align: center;">
          <div style="padding: 40px 0;">
            <van-icon name="play-circle" size="64" color="#07c160" @click="speak(currentListeningWord.word, 1, false)" style="cursor: pointer;" />
            <p style="color: #666; margin-top: 15px;">点击听发音</p>
          </div>
          <van-field 
            v-model="listeningInput" placeholder="在此拼写单词..." input-align="center" size="large"
            style="background: #f7f8fa; border-radius: 8px; margin-bottom: 20px;" @keyup.enter="nextListeningWord"
          />
          <van-button type="success" block round @click="nextListeningWord">下一词</van-button>
        </van-cell-group>
      </div>

      <div class="content" v-else-if="isListeningFinished">
        <div style="text-align: center; padding: 20px 0;">
          <van-icon name="checked" size="64" color="#07c160" />
          <h2 style="margin: 10px 0;">听写完成！</h2>
          <p style="color: #666; font-size: 18px;">正确率: <strong style="color: #07c160;">{{ listeningAccuracy }}%</strong></p>
        </div>
        <van-cell-group inset title="错题复盘">
          <van-cell v-if="listeningMistakes.length === 0" title="太棒了！全对！" />
          <div v-for="(item, index) in listeningMistakes" :key="index" style="padding: 10px 16px; border-bottom: 1px solid #eee;">
            <div style="font-weight: bold; font-size: 16px; color: #ee0a24;">你的拼写: {{ item.userInput || '(留空)' }}</div>
            <div style="color: #07c160; margin-top: 5px;">正确拼写: {{ item.correctWord }}</div>
            <div style="color: #999; font-size: 13px; margin-top: 5px;">释义: {{ item.meaning }}</div>
          </div>
        </van-cell-group>
        <div style="padding: 20px 16px;">
          <van-button type="primary" block round @click="exitListening">返回列表</van-button>
        </div>
      </div>
    </div>

    <!-- ==================== 模块三：长难句精听 (Intensive Listening) ==================== -->
    <div v-show="activeTab === 2" style="padding-bottom: 60px;">
      <div v-if="!intensiveMode">
        <van-notice-bar left-icon="records" :text="'当前精听库共有 ' + intensiveWords.length + ' 个长难句'" />
        <div style="margin: 20px 16px;">
          <van-uploader accept=".csv" :max-count="1" :after-read="handleFileUpload">
            <van-button icon="description" type="warning" plain block>上传长难句 (CSV格式)</van-button>
          </van-uploader>
          <van-button icon="plus" type="warning" plain block style="margin-top: 15px;" @click="showAddDialog = true">
            手动录入长难句
          </van-button>
        </div>
        
        <van-cell-group inset title="我的精听列表" style="margin-top:20px;">
          <van-cell v-if="intensiveWords.length === 0" title="暂无长难句记录" />
          <van-cell 
            v-for="item in intensiveWords" :key="item.id" 
            :title="item.word.length > 25 ? item.word.substring(0, 25) + '...' : item.word" 
            :label="item.note ? '📝 有笔记' : '✍️ 未做笔记'" 
            is-link @click="openIntensiveItem(item)"
          />
        </van-cell-group>
      </div>

      <div class="content" v-else>
        <van-nav-bar left-text="返回列表" left-arrow @click-left="intensiveMode = false" />
        <van-cell-group inset style="margin-top: 20px; padding: 20px 16px;">
          <h3 style="color: #333; margin-top: 0;">🎧 英音精听器</h3>
          <p style="font-size: 16px; color: #444; line-height: 1.6;">{{ currentIntensiveItem.word }}</p>
          <p style="font-size: 14px; color: #999;">{{ currentIntensiveItem.meaning }}</p>
          
          <div style="display: flex; justify-content: space-around; align-items: center; margin: 20px 0;">
            <van-button size="small" type="default" @click="speak(currentIntensiveItem.word, 0.75, true)">慢速 0.75x</van-button>
            <van-button icon="play-circle" type="warning" round @click="speak(currentIntensiveItem.word, 1.0, true)">常速 1.0x</van-button>
            <van-button size="small" type="default" @click="speak(currentIntensiveItem.word, 1.25, true)">快速 1.25x</van-button>
          </div>
          
          <div style="margin-top: 30px;">
            <h4 style="color: #666; margin-bottom: 10px;">📝 我的复盘笔记 (连读/吞音等)</h4>
            <van-field
              v-model="intensiveNoteInput"
              rows="3" autosize type="textarea" maxlength="200"
              placeholder="在这里记录没听出的词、连读规律等..." show-word-limit
              style="border: 1px solid #ebedf0; border-radius: 8px;"
            />
            <van-button type="warning" block style="margin-top: 15px;" @click="saveNote">保存笔记</van-button>
          </div>
        </van-cell-group>
      </div>
    </div>

    <!-- 底部 Tab 导航 -->
    <van-tabbar v-model="activeTab" active-color="#1989fa">
      <van-tabbar-item icon="flag-o">阅读特训</van-tabbar-item>
      <van-tabbar-item icon="service-o">听力默写</van-tabbar-item>
      <van-tabbar-item icon="records">长难句精听</van-tabbar-item>
    </van-tabbar>

    <!-- 公用录入弹窗 -->
    <van-dialog v-model:show="showAddDialog" :title="getDialogTitle" show-cancel-button @confirm="submitSingleWord">
      <van-cell-group inset style="margin: 15px 0;">
        <van-field v-model="newWordForm.word" :label="activeTab === 2 ? '句子' : '单词'" :placeholder="activeTab === 2 ? '例: It is significantly important to...' : '例: resemble'" type="textarea" autosize />
        <van-field v-model="newWordForm.meaning" label="意思" placeholder="翻译..." type="textarea" autosize />
        <van-field v-model="newWordForm.synonym" label="近义词" placeholder="多个用 | 隔开" v-if="activeTab === 0" />
      </van-cell-group>
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { showToast, showLoadingToast, closeToast } from 'vant'
import { supabase } from './supabase'
import Papa from 'papaparse'

const activeTab = ref(0) 
const readingWords = ref([])
const listeningWords = ref([])
const intensiveWords = ref([]) 

const showAddDialog = ref(false)
const newWordForm = ref({ word: '', meaning: '', synonym: '' })
const getDialogTitle = computed(() => {
  if (activeTab.value === 0) return '录入阅读单词';
  if (activeTab.value === 1) return '录入听力单词';
  return '录入精听长难句';
})

// Reading状态
const isPracticing = ref(false)
const score = ref(0)
const currentQuestion = ref(null)
const currentOptions = ref([])
const hasAnswered = ref(false)
const selectedOption = ref(null)
const isCorrect = ref(false)

// Listening状态
const isListeningMode = ref(false)
const isListeningPracticing = ref(false)
const isListeningFinished = ref(false)
const listeningCurrentModule = ref([])
const listeningIndex = ref(0)
const listeningInput = ref('')
const listeningResults = ref([])

// Intensive状态
const intensiveMode = ref(false)
const currentIntensiveItem = ref(null)
const intensiveNoteInput = ref('')

const fetchWordsCount = async () => {
  const { data, error } = await supabase.from('words').select('*').order('created_at', { ascending: true })
  if (!error && data) {
    readingWords.value = data.filter(w => w.category === 'reading' || !w.category)
    listeningWords.value = data.filter(w => w.category === 'listening')
    intensiveWords.value = data.filter(w => w.category === 'intensive')
  }
}

const listeningModules = computed(() => {
  const dateMap = {}
  listeningWords.value.forEach(w => {
    const d = new Date(w.created_at).toLocaleDateString()
    if (!dateMap[d]) dateMap[d] = []
    dateMap[d].push(w)
  })
  const dates = Object.keys(dateMap).sort()
  const modules = []
  for (let i = 0; i < dates.length; i += 2) {
    let combinedWords = [...dateMap[dates[i]]]
    let dateStr = dates[i]
    if (i + 1 < dates.length) {
      combinedWords = combinedWords.concat(dateMap[dates[i+1]])
      dateStr += ' ~ ' + dates[i+1]
    }
    modules.push({ dateRange: dateStr, words: combinedWords })
  }
  return modules
})

const getCategoryByTab = () => {
  if (activeTab.value === 0) return 'reading';
  if (activeTab.value === 1) return 'listening';
  return 'intensive';
}

const submitSingleWord = async () => {
  if (!newWordForm.value.word || !newWordForm.value.meaning) return showToast('内容和意思不能为空哦！')
  showLoadingToast({ message: '正在保存...', forbidClick: true })
  
  const { error } = await supabase.from('words').insert({
    word: newWordForm.value.word, meaning: newWordForm.value.meaning, 
    synonym: newWordForm.value.synonym, category: getCategoryByTab()
  })
  closeToast()
  if (error) showToast('添加失败')
  else {
    showToast('添加成功！')
    newWordForm.value = { word: '', meaning: '', synonym: '' }
    fetchWordsCount()
  }
}

const handleFileUpload = (fileObj) => {
  const file = fileObj.file
  showLoadingToast({ message: '正在上传...', forbidClick: true })
  const cat = getCategoryByTab()
  Papa.parse(file, {
    header: true, skipEmptyLines: true,
    complete: async (results) => {
      const rows = results.data.map(row => ({ ...row, category: cat }))
      const { error } = await supabase.from('words').insert(rows)
      closeToast()
      if (error) showToast('上传失败: ' + error.message)
      else { showToast('上传成功！'); fetchWordsCount() }
    }
  })
}

// 核心发音引擎：新增了速率支持和纯正英音匹配
const speak = (text, rate = 1.0, useBritish = false) => {
  window.speechSynthesis.cancel() // 打断之前的发音
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = rate
  
  // 查找并匹配英音女声或男声
  const voices = window.speechSynthesis.getVoices()
  let ukVoice = voices.find(v => v.lang === 'en-GB' && v.name.includes('Female'))
  if(!ukVoice) ukVoice = voices.find(v => v.lang === 'en-GB')
  
  if (useBritish && ukVoice) {
    utterance.voice = ukVoice
  } else {
    utterance.lang = 'en-US'
  }
  
  window.speechSynthesis.speak(utterance)
}

// 防止页面初次加载时声音列表未获取到的问题
if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices()
}

// ----- 阅读模块函数省略，同 V2 -----
const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
const startPractice = () => {
  if (readingWords.value.length < 4) return showToast('词库至少需要4个单词！')
  isPracticing.value = true; score.value = 0; nextQuestion()
}
const nextQuestion = () => {
  hasAnswered.value = false; selectedOption.value = null
  const q = readingWords.value[Math.floor(Math.random() * readingWords.value.length)]
  currentQuestion.value = q
  let optionsPool = [{ text: q.synonym || q.word, meaning: q.meaning }]
  while (optionsPool.length < 4) {
    const fallback = readingWords.value[Math.floor(Math.random() * readingWords.value.length)]
    const fakeText = fallback.synonym || fallback.word
    if (!optionsPool.find(opt => opt.text === fakeText) && fakeText) {
      optionsPool.push({ text: fakeText, meaning: fallback.meaning })
    }
  }
  currentOptions.value = shuffleArray(optionsPool)
  speak(q.word, 1, false)
}
const handleSelect = (optionText) => {
  selectedOption.value = optionText; hasAnswered.value = true
  isCorrect.value = (optionText === (currentQuestion.value.synonym || currentQuestion.value.word))
  if (isCorrect.value) score.value++
  speak(optionText, 1, false)
}
const getButtonType = (optionText) => {
  if (!hasAnswered.value) return 'default'
  if (optionText === (currentQuestion.value.synonym || currentQuestion.value.word)) return 'success'
  if (optionText === selectedOption.value && !isCorrect.value) return 'danger'
  return 'default'
}

// ----- 听力模块函数 -----
const currentListeningWord = computed(() => listeningCurrentModule.value[listeningIndex.value])
const startListeningModule = (words) => {
  listeningCurrentModule.value = shuffleArray([...words])
  isListeningMode.value = true; isListeningPracticing.value = true; isListeningFinished.value = false; listeningIndex.value = 0; listeningResults.value = []; listeningInput.value = ''
  setTimeout(() => speak(currentListeningWord.value.word, 1, false), 500)
}
const nextListeningWord = () => {
  listeningResults.value.push({
    correctWord: currentListeningWord.value.word, userInput: listeningInput.value.trim().toLowerCase(),
    meaning: currentListeningWord.value.meaning, isRight: listeningInput.value.trim().toLowerCase() === currentListeningWord.value.word.toLowerCase()
  })
  listeningIndex.value++; listeningInput.value = ''
  if (listeningIndex.value >= listeningCurrentModule.value.length) {
    isListeningPracticing.value = false; isListeningFinished.value = true
  } else { speak(currentListeningWord.value.word, 1, false) }
}
const listeningMistakes = computed(() => listeningResults.value.filter(r => !r.isRight))
const listeningAccuracy = computed(() => {
  if (listeningResults.value.length === 0) return 0
  return Math.round((listeningResults.value.filter(r => r.isRight).length / listeningResults.value.length) * 100)
})
const exitListening = () => { isListeningMode.value = false; isListeningPracticing.value = false; isListeningFinished.value = false }

// ----- 精听模块函数 -----
const openIntensiveItem = (item) => {
  currentIntensiveItem.value = item
  intensiveNoteInput.value = item.note || ''
  intensiveMode.value = true
}

const saveNote = async () => {
  showLoadingToast({ message: '保存中...', forbidClick: true })
  const { error } = await supabase.from('words')
    .update({ note: intensiveNoteInput.value })
    .eq('id', currentIntensiveItem.value.id)
  closeToast()
  
  if (error) showToast('保存失败')
  else {
    showToast('笔记保存成功！')
    currentIntensiveItem.value.note = intensiveNoteInput.value
    // 同步更新本地列表，无需重新请求数据库
    const idx = intensiveWords.value.findIndex(w => w.id === currentIntensiveItem.value.id)
    if(idx > -1) intensiveWords.value[idx].note = intensiveNoteInput.value
  }
}

onMounted(() => fetchWordsCount())
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
.option-btn :deep(.van-button__text) { display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.4; }
.option-text { font-size: 16px; font-weight: 500; }
.option-meaning { font-size: 13px; color: #666; margin-top: 4px; }
.van-button--danger .option-meaning, .van-button--success .option-meaning { color: #fff; opacity: 0.9; }
.action-area { margin-top: 24px; }
</style>