const fs = require("fs");
const path = require("path");
const tinify = require("tinify");
tinify.key = ""; // YOUR_API_KEY
const { Select, MultiSelect, NumberPrompt, Input } = require('enquirer');
const ALL = 'All of them!!!'

const list = [];

const config = {
  filterList: [],
  targetDir: path.resolve("./"),
  sizeThreshold: 0,
  isCover: false,
  cacheDir: '',
  selectList: []
}

let totalCompressSize = 0;
let totalCompressCount = 0;

function listFile(dir, sizeThreshold){
	const arr = fs.readdirSync(dir);
	arr.forEach(item => {
		const fullpath = path.join(dir,item);
		const stats = fs.statSync(fullpath);
		if (stats.isDirectory()) {
			listFile(fullpath, sizeThreshold);
		} else {
      const format = item.slice(item.lastIndexOf('.') + 1);
      const size = Math.ceil(stats.size / 1024);
      if (format === 'png' && size >= sizeThreshold) {
        config.filterList.push({
          name: item,
          value: {
            name: item, 
            size: size + 'kb',
            from: fullpath,
          }
        });
      }
		}
	});
}

function compressPic() {
  console.log('---------------------Start Compress---------------------');
  config.selectList.forEach(item => {
    console.log('Start to compress picture:', item.from);
    item.output = config.isCover ? item.from : path.resolve(config.cacheDir, item.name);
    tinify.fromFile(item.from).toFile(item.output).then(() => {
      const newStats = fs.statSync(item.output);
      const size =  Math.ceil(newStats.size / 1024) + 'kb';
      console.log('File:', item.name, '\tBefore:', item.size, '\tAfter:', size);
      totalCompressCount++;
      totalCompressSize += (parseFloat(item.size) - parseFloat(size));
      if (totalCompressCount === config.selectList.length) {
        if (totalCompressSize > 1024) {
          console.log(`总共压缩了${totalCompressSize/1024}MB`);
        } else {
          console.log(`总共压缩了${totalCompressSize}KB`);
        }
      }
    }).catch(err => {
      console.log(err);
    })
  });
}


function inputTargetDir() {
  const targetDirPrompt = new Input({
    message: '待检索目录(递归搜索所有图片,支持相对路径,直接回车默认为当前目录): ',
    initial: ''
  });
  targetDirPrompt.run()
    .then(targetDir => {
      if (targetDir !== '') {
        config.targetDir = targetDir;
      }
      
      inputSizeThresholdDir();
    })
    .catch(console.error);
}

function inputSizeThresholdDir() {
  const sizeThresholdPrompt = new NumberPrompt({
    message: '图片超过多大进行压缩？输入阈值(单位kb, 直接回车默认全压缩): ',
    initial: 0,
    min: 0,
    float: true
  });
  sizeThresholdPrompt.run()
  .then(sizeThreshold => {
    if (sizeThreshold === '') {
      sizeThreshold = 0;
    }
    config.sizeThreshold = parseFloat(sizeThreshold);
    // console.log('config', config)
    selectCompressPics();
  })
  .catch(console.error);
}

function selectCompressPics() {
  listFile(config.targetDir, config.sizeThreshold);
  const namePrompt = new MultiSelect({
    name: 'whichPics',
    message: '请选择需压缩的图片: ',
    limit: 10,
    choices: [ALL, ...config.filterList],
    initial: 0,
    result(names) {
      return this.map(names);
    }
  })
  namePrompt.run()
  .then(whichPics => {
    if (whichPics[ALL]) {
      config.selectList = config.filterList.map(item => item.value)
    } else {
      config.selectList = Object.values(whichPics);
    }
    // console.log('config.selectList', config.selectList)
    isCoverSelect();
  })
  .catch(console.error);
}

function isCoverSelect() {
  const isCoverPrompt = new Select({
    message: '压缩后的图片是否覆盖原图片所在位置？: ',
    choices: ['No', 'Yes']
  });
  isCoverPrompt.run()
  .then(choice => {
    if (choice === 'Yes') {
      config.isCover = true;
      compressPic();
    } else {
      inputCacheDir();
    }
    
  })
  .catch(console.error);
}

function inputCacheDir() {
  const cacheDirPrompt = new Input({
    message: '请输入图片压缩后保存目录(直接回车默认为当前目录): ',
    initial: ''
  });
  cacheDirPrompt.run()
  .then(cacheDir => {
    cacheDir = path.resolve(cacheDir);
    config.cacheDir = cacheDir;
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, {recursive: true});
    }
    compressPic();
  })
  .catch(console.error);
}

inputTargetDir();

