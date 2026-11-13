// 仅保留本地功能：PDF 导出（chrome.debugger）与标签页 URL 变化广播。

const generatePDF = async (tabId, fileName) => {
  try {
    await chrome.debugger.attach({ tabId }, '1.3')

    const result = await chrome.debugger.sendCommand(
      { tabId },
      'Page.printToPDF',
      {
        printBackground: true,      // 打印背景
        displayHeaderFooter: true,  // 自定义页眉模板
        headerTemplate: `<div style="display: flex; justify-content: space-between; font-size: 13px;width: calc(100% - 2cm);margin: 0 auto;line-height: 1.2em;height: 1.2em;border-bottom: 1px solid #ccc;"><span class="date"></span><span>${fileName}</span></div>`,
        marginTop: 0.5, // 值太小，页眉页脚出不来
        marginBottom: 0.4, // 值太小，页眉页脚出不来
        marginLeft: 0,
        marginRight: 0,
        generateDocumentOutline: true  // 生成文档大纲
      }
    )

    return result.data
  } finally {
    await chrome.debugger.detach({ tabId }).catch(() => { })
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'export-pdf') {
    generatePDF(sender.tab.id, message.data.fileName).then((base64Data) => {
      sendResponse({ data: base64Data })
    }).catch(error => {
      console.log('export-pdf error', error)

      const msg = error.message.toLowerCase().includes('detached while handling command') ? '609' : error.message
      sendResponse({ errorMsg: msg })
    })
  }
  return true
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    chrome.tabs.sendMessage(tabId, { type: 'page-updated', data: { url: tab.url } }).catch(() => { })
  }
})
