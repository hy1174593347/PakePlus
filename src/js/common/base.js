define(function(require, exports, module) {
    var systemConfig = require('config').init();
    exports.init = function() {
        var md = angular.module('yxBase', []);
        md.factory('baseService', function($http, $q, $compile,$window,$timeout,$parse) {
            var service = {systemConfig: systemConfig};

            var PERSIST_KEYS = ['token', 'userInfo'];
            var LS_PREFIX = 'yx_';

            if(!window.top.caches){
                window.top.caches = {};
            }


            var cusModal = function(type){
                var myModal = document.getElementById('myModal');
                if(myModal){
                    var modal = bootstrap.Modal.getInstance(document.getElementById('myModal'));
                    if (!modal) {
                        modal = new bootstrap.Modal(document.getElementById('myModal'));
                    }
                }
                if(modal){
                    if('show' === type){
                        modal.show();
                    }else{
                        modal.hide();
                    }
                }
            }

            service.getUrl = function(url){
                var host = systemConfig.host + ':' + systemConfig.port + systemConfig.apiRoot;
                return host + url;
            };

            /**
             * 发异步请求统一接口
             * @url 请求路径
             * @param 请求参数
             * @httpType 请求类型，post或get
             */
            service.http = function(url, param, httpType) {
                var defferred = $q.defer();
                var requestType = httpType || 'post';
                var requestUrl = this.getUrl(url);

                var httpConfig = {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                };

                var token = this.getCache('token');
                if (token) {
                    httpConfig.headers['Authorization'] = 'Bearer ' + token;
                }

                cusModal('show');

                var promise;
                if (requestType.toLowerCase() === 'post') {
                    // post(url, data, config)
                    promise = $http.post(requestUrl, param, httpConfig);
                } else {
                    // get(url, config)，参数通过 params 传递
                    httpConfig.params = param;
                    promise = $http.get(requestUrl, httpConfig);
                }
                promise.then(function(data) {
                    cusModal('hide');
                    if(data.data && data.data.code == 401){
                        window.top.location = systemConfig.webRoot + "/login.html";
                        return;
                    }
                    if(data.data.code == 200){
                        defferred.resolve(data.data.data);
                    }else{
                        defferred.reject(data.data.message);
                    }
                }).catch(function(data) {
                    cusModal('hide');
                    if(data.data && data.data.code == 401){
                        window.top.location = systemConfig.webRoot + "/login.html";
                        return;
                    }
                    defferred.reject(data.data ? data.data.message : '');
                });
                return defferred.promise;
            };

            /**
             * 发异步请求统一接口
             * @url 请求路径
             * @param 请求参数
             * @httpType 请求类型，post或get
             */
            service.httpNoModal = function(url, param, httpType) {
                var defferred = $q.defer();
                var requestType = httpType || 'post';
                var requestUrl = this.getUrl(url);
                var httpConfig = {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                };
                var token = this.getCache('token');
                if (token) {
                    httpConfig.headers['Authorization'] = 'Bearer ' + token;
                }

                var promise;
                if (requestType.toLowerCase() === 'post') {
                    // post(url, data, config)
                    promise = $http.post(requestUrl, param, httpConfig);
                } else {
                    // get(url, config)，参数通过 params 传递
                    httpConfig.params = param;
                    promise = $http.get(requestUrl, httpConfig);
                }
                promise.then(function(data) {
                    if(data.data && data.data.code == 401){
                        window.top.location = systemConfig.webRoot + "/login.html";
                        return;
                    }
                    if(data.data.code == 200){
                        defferred.resolve(data.data.data);
                    }else{
                        defferred.reject(data.data.message);
                    }
                }).catch(function(data) {
                    if(data.data && data.data.code == 401){
                        window.top.location = systemConfig.webRoot + "/login.html";
                        return;
                    }
                    defferred.reject(data.data ? data.data.message : '');
                });
                return defferred.promise;
            };
            
            /**
             * 提示信息接口
             * @message 提示信息
             * @type 类型，success-成功，info-信息，warning-警告，danger-错误
             * @scope
             * @times 提示持续时间
             * @isApplyScope 是否刷新视图,会调用scope的$apply函数
             */
            service.tips = function(message,type,scope,times,isApplyScope){
            	var _this = scope || this;
            	times = times || 3000;
            	isApplyScope = isApplyScope || true;
            	_this[type+'Message'] = message;
            	_this.ctrl['show' + type + 'Message'] = true;
            	$timeout(function(){
            		_this.ctrl['show' + type + 'Message'] = false;
            	},times,isApplyScope)
            };
            
            /**
             * 验证表单
             */
            service.validForm = function(form){
            	return form.$valid;
            };
            
            /**
             * 获取指定scope下的属性值
             */
            service.getValue = function(propertyName,scope){
            	if(!scope) return null;
            	var getter = $parse(propertyName);
            	return getter(scope);
            };
            
            /**
             * 设置指定scope下的属性值
             */
            service.setValue = function(propertyName,scope,newValue){
            	if(!scope) return null;
            	var getter = $parse(propertyName);
            	var setter = getter.assign;
            	setter(scope,newValue);
            };
            
            /**
             * 从集合中查找值并设置到指定的属性下
             */
            service.setProp = function(list,obj,searchProp,setProp,searchOptions,setOptions){
            	if(_.isEmpty(list) || !obj || !searchProp || !setProp) return;
            	
            	var key = searchOptions ? searchOptions : 'baseCode';
            	var value = setOptions ? setOptions : 'baseName';
            	var searchParam = {};
            	searchParam[key] = obj[searchProp];
            	var findObj = _.find(list,searchParam);
            	if(findObj){
            		obj[setProp] = findObj[value];
            	}
            }

            service.modal = function(type,name){
                var myModal = document.getElementById(name);
                if(myModal){
                    var modal = bootstrap.Modal.getInstance(document.getElementById(name));
                    if (!modal) {
                        modal = new bootstrap.Modal(document.getElementById(name));
                    }
                }
                if(modal){
                    if('show' === type){
                        modal.show();
                    }else{
                        modal.hide();
                    }
                }
            }

            service.getCache = function(cacheName){
                // 1. 先查内存
                if (window.top.caches[cacheName] !== undefined) {
                    return window.top.caches[cacheName];
                }

                // 2. 内存没有 → 尝试从 localStorage 恢复
                if (PERSIST_KEYS.indexOf(cacheName) > -1) {
                    try {
                        var str = localStorage.getItem(LS_PREFIX + cacheName);
                        if (str !== null) {
                            var val = JSON.parse(str);       // 反序列化：保持原始类型
                            window.top.caches[cacheName] = val; // 回填内存，后续读取更快
                            return val;
                        }
                    } catch (e) {
                        console.warn('getCache localStorage 读取失败:', cacheName, e);
                    }
                }

                return undefined;
            }

            service.setCache = function(cacheName,value){
                // 1. 内存缓存（保持原有行为）
                window.top.caches[cacheName] = value;

                // 2. 白名单内的 key 同时写入 localStorage
                if (PERSIST_KEYS.indexOf(cacheName) > -1) {
                    try {
                        localStorage.setItem(LS_PREFIX + cacheName, JSON.stringify(value));
                    } catch (e) {
                        console.warn('setCache localStorage 写入失败:', cacheName, e);
                    }
                }

            }

            service.clearCache = function(){
                // 清内存
                window.top.caches = {};

                // 清 localStorage（只清我们管理的 key）
                PERSIST_KEYS.forEach(function(k){
                    try { localStorage.removeItem(LS_PREFIX + k); } catch (e) {}
                });
            }

            /**
             * 在树形数据中递归搜索匹配 label 的节点
             * @param {Array} list - 树形数据数组，每项包含 label 和可选的 children
             * @param {string} name - 要匹配的字符串（模糊匹配）
             * @param {string} [matchMode='includes'] - 匹配模式，可选 'includes' | 'startsWith' | 'endsWith' | 'equals'
             * @returns {Array} 过滤后的新数组（不修改原数据）
             */
            service.searchTree = function(list, name, matchMode = 'includes') {
                if (!list || !Array.isArray(list)) return [];

                var result = [];

                for (var item of list) {
                    // 深拷贝当前节点（避免污染原数据）
                    var clone = { ...item };
                    // 检查当前节点的 label 是否匹配
                    var label = clone.label || '';
                    let isMatch = false;

                    switch (matchMode) {
                        case 'startsWith':
                            isMatch = label.startsWith(name);
                            break;
                        case 'endsWith':
                            isMatch = label.endsWith(name);
                            break;
                        case 'equals':
                            isMatch = label === name;
                            break;
                        case 'includes':
                        default:
                            isMatch = label.toLowerCase().includes(name.toLowerCase());
                            break;
                    }

                    if (isMatch) {
                        // 当前节点匹配：保留其所有原始 children（不进行过滤）
                        // 注意：如果 children 是数组，保留原始引用或浅拷贝即可，因为不修改内部数据
                        // 但为了安全，可深拷贝 children（如果数据量不大）
                        clone.children = item.children ? [...item.children] : [];
                        result.push(clone);
                    } else {
                        // 当前节点不匹配：递归搜索 children
                        var filteredChildren = [];
                        if(item.children && item.children.length > 0){
                            var temp = this.searchTree(item.children, name, matchMode);
                            filteredChildren = filteredChildren.concat(temp);
                        }
                        if (filteredChildren && filteredChildren.length > 0) {
                            // 有子节点匹配，保留当前节点，并用过滤后的 children 替换
                            clone.children = filteredChildren;
                            result.push(clone);
                        }

                        var filteredRels = [];
                        if(item.catalogueRels && item.catalogueRels.length > 0){
                            var temp = this.searchTree(item.catalogueRels, name, matchMode);
                            filteredRels = filteredRels.concat(temp);
                        }
                        if (filteredRels && filteredRels.length > 0) {
                            // 有子节点匹配，保留当前节点，并用过滤后的 children 替换
                            clone.catalogueRels = filteredRels;
                            result.push(clone);
                        }
                        // 否则丢弃当前节点
                    }
                }

                return result;
            }

            /**
             * 在树形数据中递归筛选选中的节点
             * @param {Array} list - 树形数据数组，每项包含 label 和可选的 children
             * @returns {Array} 过滤后的新数组（不修改原数据）
             */
            service.filterCheckTree = function(list,customData) {
                if (!list || !Array.isArray(list)) return [];

                for (var item of list) {
                    // 深拷贝当前节点（避免污染原数据）
                    var clone = { ...item };
                    let isChecked = clone.checked;

                    if (isChecked) {
                        // 当前节点匹配：保留其所有原始 children（不进行过滤）
                        // 注意：如果 children 是数组，保留原始引用或浅拷贝即可，因为不修改内部数据
                        // 但为了安全，可深拷贝 children（如果数据量不大）
                        clone.children = item.children ? [...item.children] : [];
                        clone.catalogueRels = item.catalogueRels ? [...item.catalogueRels] : [];
                        if(clone.children.length > 0 || clone.catalogueRels.length > 0){
                            clone.checkedAll = true;
                            customData.ruleRepCatalogueId = clone.ruleRepCatalogueId;
                            if(clone.catalogueRels.length > 0){
                                customData.ruleList = customData.ruleList.concat(clone.catalogueRels);
                            }
                        }

                        if(clone.ruleId || clone.idRuleTable){
                            customData.ruleList.push(clone);
                        }
                    } else {
                        // 当前节点不匹配：递归搜索 children
                        if(item.children && item.children.length > 0){
                            customData = this.filterCheckTree(item.children,customData);
                        }

                        if(item.catalogueRels && item.catalogueRels.length > 0){
                            customData = this.filterCheckTree(item.catalogueRels,customData);
                        }
                        // 否则丢弃当前节点
                    }
                }

                return customData;
            }


            /**
             * AES-256-CBC 加密，返回 Base64
             * 输出格式：IV(16字节) || 密文
             */
            service.encryptToBase64 = function(plainText, base64Key) {
                var key = CryptoJS.enc.Base64.parse(base64Key);
                var iv = CryptoJS.enc.Hex.parse('00000000000000000000000000000000');

                if (key.sigBytes !== 16 && key.sigBytes !== 24 && key.sigBytes !== 32) {
                    throw new Error("AES key must be 16/24/32 bytes, but got " + key.sigBytes);
                }

                var encrypted = CryptoJS.AES.encrypt(plainText, key, {
                    iv: iv,
                    mode: CryptoJS.mode.CBC,
                    padding: CryptoJS.pad.Pkcs7
                });

                var combined = iv.clone().concat(encrypted.ciphertext);
                return CryptoJS.enc.Base64.stringify(combined);
            }

            /**
             * AES-256-CBC 解密
             * @param {string} base64CipherText IV(16字节) + 密文 的 Base64
             * @param {string} base64Key Base64 编码的 AES 密钥
             */
            service.decryptFromBase64 = function(base64CipherText, base64Key) {
                var key = CryptoJS.enc.Base64.parse(base64Key);
                var combined = CryptoJS.enc.Base64.parse(base64CipherText);

                if (combined.sigBytes <= 16) {
                    throw new Error("Invalid cipher data");
                }

                var iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4), 16);
                var ciphertext = CryptoJS.lib.WordArray.create(
                    combined.words.slice(4),
                    combined.sigBytes - 16
                );

                var decrypted = CryptoJS.AES.decrypt(
                    { ciphertext: ciphertext },
                    key,
                    { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
                );

                var plain = decrypted.toString(CryptoJS.enc.Utf8);
                if (!plain) {
                    throw new Error("AES decryption failed");
                }
                return plain;
            }

            /**
             * SHA-256 哈希，返回十六进制字符串（用于辅助索引列）
             */
            service.sha256Hex = function(input) {
                return CryptoJS.SHA256(input).toString(CryptoJS.enc.Hex);
            }

            /**
             * SHA-256 哈希，返回 Base64
             */
            service.sha256Base64 = function(input) {
                return CryptoJS.SHA256(input).toString(CryptoJS.enc.Base64);
            }

            return service;
        });
    }
});