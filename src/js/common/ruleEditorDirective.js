define(function (require, exports, module) {
    require('common/base').init();
    var md = angular.module('ruleEditorDirective', ['yxBase']);

    md.directive('ruleEditor', ['$compile', '$timeout', function ($compile, $timeout) {
        return {
            restrict: 'A',
            scope: {
                edit: '=',
                tokens: '=',
                bomTree: '=',
                operators: '=',
                baseDatas: '=',
                queryBaseData: '&',
                getPropertyByClass: '&',
                placeholder: '@',
                editType:'@'
            },
            link: function (scope, element, attrs) {
                // ---------- 确保编辑器可编辑 ----------
                element.attr('contenteditable', scope.edit);
                element.addClass('rule-editor');
                if (scope.placeholder) {
                    element.attr('data-placeholder', scope.placeholder);
                }

                var shouldMoveCursor = true;   // 控制是否移动光标

                // ---------- 内部状态 ----------
                var suggestion = {
                    visible: false,
                    items: [],
                    top: 0,
                    left: 0,
                    targetToken: null,
                    mode: 'bom',
                    searchText: ''
                };

                var customerText = ['+','-','*','/','(',')','并且','或者','设置','为','指定'];

                var contextStack = [];     // 存储各级 children 数组，用于删除文本后恢复上下文
                var currentContext = [];   // 当前可用的列表
                var editorEl = element[0];
                var suggestionEl = null;

                // ---------- 辅助函数 ----------
                function isWhenRule(){
                    return scope.editType == 'whenRule';
                }
                function isResultRule(){
                    return scope.editType == 'thenRule' || scope.editType == 'elseRule';
                }
                function isPreRule(){
                    return scope.editType == 'preRule';
                }
                function isStringType(type) {
                    return type === 'java.lang.String';
                }
                function isNumberType(type) {
                    return /^(java\.lang\.(Integer|Double|Float|Long|Short|Byte)|int|double|float|long|short|byte)$/.test(type);
                }
                function isDateType(type) {
                    return type === 'java.util.Date';
                }
                function isVoidType(type) {
                    return type === 'void';
                }
                function isCustomerText(text) {
                    for(var i = 0; i < customerText.length; i++){
                        var temp = customerText[i];
                        if(text.endsWith(temp)){
                            return true;
                        }
                    }
                    return false;
                }

                function getCustomerText(text) {
                    for(var i = 0; i < customerText.length; i++){
                        var temp = customerText[i];
                        if(text.endsWith(temp)){
                            return temp;
                        }
                    }
                    return null;
                }

                // 根据属性类型筛选运算符
                function filterOperators(propertyType) {
                    if (isResultRule()) {
                        var filtered = [{
                            "metaRuleId": "=",
                            "metaRuleName": "为",
                            "metaDefineParams": [
                                {
                                    "metaRuleParamId": "para1",
                                },
                                {
                                    "metaRuleParamId": "para2",
                                }
                            ]
                        }];
                        return filtered;
                    } else if (isPreRule()) {

                    } else {
                        if (!scope.operators) return [];
                        return scope.operators.filter(function (op) {
                            var typeId = parseInt(op.typeId);
                            if (typeId === 1) return true;
                            if (typeId === 2) return isStringType(propertyType);
                            if (typeId === 3) return isNumberType(propertyType) || isDateType(propertyType);
                            return false;
                        });
                    }
                }

                // 获取占位符左侧的节点
                function getLeftNode(token) {
                    var idx = scope.tokens.indexOf(token);
                    if (idx <= 0) return null;
                    var prev = scope.tokens[idx - 1];
                    if (prev && prev.type === 'keyword' && prev.dataRef) {
                        return prev.dataRef;
                    }
                    return null;
                }

                // 获取下一个占位符
                function getNextPlaceholder(token) {
                    var idx = scope.tokens.indexOf(token);
                    for (var i = idx + 1; i < scope.tokens.length; i++) {
                        if (scope.tokens[i].type === 'placeholder') {
                            return scope.tokens[i];
                        }
                    }
                    return null;
                }

                // 从列表中查找匹配的节点（用于上下文恢复）
                function findChild(list, targetRef) {
                    if (!list) return null;
                    for (var i = 0; i < list.length; i++) {
                        if (list[i] === targetRef) return list[i];
                    }
                    return null;
                }

                // ---------- 上下文管理 ----------
                function resetContext() {
                    currentContext = angular.copy(scope.bomTree);
                    contextStack = [];
                }
                resetContext();

                // 根据当前 tokens 重建上下文（用于删除文本后恢复）
                function rebuildContext() {
                    // 收集所有 keyword 的 dataRef 路径
                    var path = [];
                    for (var i = 0; i < scope.tokens.length; i++) {
                        var t = scope.tokens[i];
                        if (t.type === 'keyword' && t.dataRef) {
                            path.push(t.dataRef);
                        }
                    }
                    // 从根开始逐级查找
                    var ctx = angular.copy(scope.bomTree);
                    for (var j = 0; j < path.length - 1; j++) {
                        var found = findChild(ctx, path[j]);
                        if (found && found.children) {
                            ctx = found.children;
                        } else {
                            resetContext();
                            return;
                        }
                    }
                    currentContext = ctx;
                    // 重建栈：根据路径 push
                    contextStack = [];
                    var stackCtx = angular.copy(scope.bomTree);
                    for (var k = 0; k < path.length - 1; k++) {
                        var found = findChild(stackCtx, path[k]);
                        if (found && found.children) {
                            contextStack.push(stackCtx);
                            stackCtx = found.children;
                        } else {
                            break;
                        }
                    }
                }

                function updatePlaceholder() {
                    var isEmpty = scope.tokens.length === 0 && element.text().trim() === '';
                    element.toggleClass('empty', isEmpty);
                }

                // ---------- 渲染引擎 ----------
                function renderTokens() {
                    element.empty();
                    angular.forEach(scope.tokens, function(token, index) {
                        if (token.type === 'newline') {
                            element[0].appendChild(document.createElement('br'));
                            return; // 跳过后面的 span 创建
                        }
                        var span = document.createElement('span');
                        span.textContent = token.text;
                        if (token.type === 'keyword') {
                            span.className = 'token-keyword';
                            if (token.isOperator) {
                                span.style.color = 'blue';
                                span.style.fontWeight = 'bold';
                                span.style.margin = '0 4px';
                            }
                        } else if (token.type === 'placeholder') {
                            span.className = 'token-placeholder';
                            span.style.color = 'brown';
                            span.style.borderBottom = '1px dashed brown';
                            span.style.cursor = 'pointer';
                            span.addEventListener('click', function(e) {
                                e.stopPropagation();
                                handlePlaceholderClick(token,index);
                            });
                        } else {
                            span.className = 'token-text';
                        }
                        if (token.error) {
                            span.classList.add('token-error');
                            span.title = token.errorMsg || '错误';
                        }
                        span.dataset.tokenId = token.id || index;
                        element[0].appendChild(span);

                        if(token.type === 'placeholder'){
                            var whiteSpace = document.createElement('span');
                            whiteSpace.textContent = ' ';
                            element[0].appendChild(whiteSpace);
                        }
                    });
                    updatePlaceholder();

                    if(shouldMoveCursor){
                        $timeout(function () {
                            moveCursorToEnd();
                        }, 0);
                    }
                }

                // 移动光标到编辑器末尾
                function moveCursorToEnd() {
                    var el = element[0];
                    el.focus();
                    var range = document.createRange();
                    range.selectNodeContents(el);
                    range.collapse(false);
                    var sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);
                }

                // ---------- 提示框操作 ----------
                function createSuggestionElement() {
                    var div = document.createElement('div');
                    div.className = 'suggestion-box';
                    div.style.position = 'absolute';
                    div.style.zIndex = '1000';
                    div.style.display = 'none';
                    element.parent().append(div);
                    return div;
                }

                function showSuggestion(items, mode, token, searchText) {
                    if (!suggestionEl) suggestionEl = createSuggestionElement();

                    // 重置位置，避免累加偏移
                    suggestion.top = 0;
                    suggestion.left = 0;

                    suggestion.items = items;
                    suggestion.mode = mode;
                    suggestion.targetToken = token;
                    suggestion.searchText = searchText || '';
                    suggestion.visible = true;

                    // 使用 $timeout 延迟计算位置，确保 DOM 稳定
                    $timeout(function() {
                        var sel = window.getSelection();
                        if (sel.rangeCount > 0) {
                            var range = sel.getRangeAt(0);
                            var rect = range.getBoundingClientRect();
                            var editorRect = editorEl.getBoundingClientRect();
                            suggestion.top = editorRect.top;
                            suggestion.left = editorRect.left;
                        }
                        // 更新 DOM 位置
                        suggestionEl.style.top = suggestion.top + 'px';
                        suggestionEl.style.left = suggestion.left + 'px';
                        suggestionEl.style.display = 'block';
                    }, 0);

                    // ★ 用统一渲染函数生成 DOM
                    var filtered = items;
                    if (searchText && searchText.trim()) {
                        var lower = searchText.toLowerCase();
                        filtered = items.filter(function (item) {
                            var label = item.name || item.metaRuleName || item.label || '';
                            return label.toLowerCase().indexOf(lower) !== -1;
                        });
                    }
                    renderSuggestionItems(filtered, mode);

                    // 让父级知道提示框可见（可触发外部滚动等）
                    scope.$apply();
                }

                function hideSuggestion() {
                    suggestion.visible = false;
                    if (suggestionEl) {
                        suggestionEl.style.display = 'none';
                    }
                }

                // ---------- 选择建议项 ----------
                function selectSuggestion(item) {
                    var token = suggestion.targetToken;

                    // 追加模式：无目标占位符，直接追加到末尾
                    if (!token) {
                        var temp = angular.copy(item);
                        delete temp.children;
                        var newToken = {
                            id: 'kw_' + Date.now(),
                            type: 'keyword',
                            text: item.name,
                            dataRef: temp,
                            context: 'bom',
                            isOperator: false
                        };
                        scope.tokens.push(newToken);
                        if (item.children && item.children.length > 0) {
                            var textToken = { id: 'txt_' + Date.now(), type: 'text', text: '的' };
                            var placeToken = { id: 'p_' + Date.now(), type: 'placeholder', text: '__', context: 'bom' };
                            scope.tokens.push(textToken, placeToken);
                            // 入栈并更新上下文
                            contextStack.push(angular.copy(currentContext));
                            currentContext = item.children;
                            suggestion.targetToken = placeToken;
                            suggestion.mode = 'bom';
                            showSuggestion(item.children, 'bom', placeToken, '');
                        } else {
                            var opToken = { id: 'p_op_' + Date.now(), type: 'placeholder', text: '⚡', context: 'operator' };
                            scope.tokens.push(opToken);
                            // 自动显示运算符提示框
                            var filtered = filterOperators(item.propertyType);
                            if (filtered.length > 0) {
                                suggestion.targetToken = opToken;
                                suggestion.mode = 'operator';
                                showSuggestion(filtered, 'operator', opToken, '');
                            } else {
                                hideSuggestion();
                                // 重置上下文到根
                                resetContext();
                            }
                        }
                        renderTokens();
                        if (!scope.$$phase && !scope.$$destroyed) scope.$apply();
                        return;
                    }

                    // 有目标占位符的逻辑
                    if (suggestion.mode === 'bom') {
                        // 选择BOM节点
                        token.text = item.name;
                        token.type = 'keyword';
                        token.context = 'bom';
                        token.dataRef = item;
                        // 保存路径
                        var { children, ...saved } = item;

                        var isMethod = item.type === 'method';
                        var isVoidMethod = isMethod && item.propertyType === 'void';
                        var afterToken = token;
                        if (isMethod) {
                            afterToken = buildMethodParams(item, token);
                        }

                        if (item.children && item.children.length > 0) {
                             // 更新上下文
                            currentContext = item.children;
                            // 入栈
                            contextStack.push(angular.copy(currentContext));
                            currentContext = item.children;
                            insertTextAndPlaceholder(afterToken, '的');
                            // 提示框定位到新占位符
                            var nextPlaceholder = getNextPlaceholder(afterToken);
                            if (nextPlaceholder) {
                                showSuggestion(item.children, 'bom', nextPlaceholder, '');
                            }
                        } else if(!isMethod || !isVoidMethod) {
                            // 无 children：插入运算符占位符，并立即显示运算符提示框
                            insertOperatorPlaceholder(afterToken);
                            // 获取插入的运算符占位符
                            var opToken = getNextPlaceholder(afterToken);
                            if (opToken) {
                                var filtered = filterOperators(item.propertyType);
                                if (filtered.length > 0) {
                                    suggestion.targetToken = opToken;
                                    suggestion.mode = 'operator';
                                    showSuggestion(filtered, 'operator', opToken, '');
                                } else {
                                    hideSuggestion();
                                    resetContext();
                                }
                            }
                        } else {
                            suggestion.targetToken = null;
                            insertResultPlaceholder(afterToken);
                            hideSuggestion();
                            resetContext();
                        }
                    } else if (suggestion.mode === 'operator') {
                        // ========== 运算符选择增强逻辑 ==========
                        var operator = item;
                        var paramCount = operator.metaDefineParams ? operator.metaDefineParams.length : 0;

                        // 插入运算符文本（蓝色，前后空格）
                        token.text = ' ' + operator.metaRuleName + ' ';
                        token.type = 'keyword';
                        token.isOperator = true;
                        token.dataRef = operator;

                        // 判断是否需要右侧参数
                        var needRightParam = paramCount > 1;

                        if (needRightParam) {
                            insertConditionPlaceholder(token);
                            // 关闭提示框，重置上下文
                            hideSuggestion();
                            suggestion.targetToken = null;
                            suggestion.mode = 'bom';
                            resetContext();
                        } else {
                            // 不需要右侧参数（void method 或 paramCount <= 1）
                            hideSuggestion();
                            suggestion.targetToken = null;
                            suggestion.mode = 'bom';
                            resetContext();
                        }
                        // ========== 运算符选择结束 ==========
                    } else if (suggestion.mode === 'baseData') {
                        // 选择基础数据
                        token.text = item.baseName || item.label;
                        token.type = 'keyword';
                        token.dataRef = item;
                        hideSuggestion();
                    }

                    // ----- 立即渲染并应用（关键修改）-----
                    renderTokens();
                    // 确保视图同步，若不在 digest 循环中则手动触发
                    if (!scope.$$phase && !scope.$$destroyed) scope.$apply();
                }

                function buildMethodParams(item,token) {
                    // method 特殊处理：根据 paramList 生成括号和多个占位符
                    var paramList = item.paramList || [];
                    var idx = scope.tokens.indexOf(token);
                    if (idx !== -1) {
                        var insertIndex = idx + 1;
                        // 插入左括号
                        scope.tokens.splice(insertIndex, 0, { id: 'txt_' + Date.now(), type: 'text', text: '(', context: 'method'});
                        insertIndex++;
                        if (paramList.length === 0) {
                            // 无参数，直接插入右括号
                            scope.tokens.splice(insertIndex, 0, { id: 'txt_' + Date.now(), type: 'text', text: ')', context: 'method'});
                        } else {
                            // 为每个参数生成占位符，用逗号分隔
                            for (var p = 0; p < paramList.length; p++) {
                                var param = paramList[p];
                                var place = { id: 'p_cond_' + Date.now() + '_' + p, type: 'placeholder', text: '__', context: 'condition',propertyType: param.propertyType };
                                scope.tokens.splice(insertIndex, 0, place);
                                insertIndex++;
                                if (p < paramList.length - 1) {
                                    scope.tokens.splice(insertIndex, 0, { id: 'txt_' + Date.now(), type: 'text', text: ', ', context: 'method'});
                                    insertIndex++;
                                }
                            }
                            scope.tokens.splice(insertIndex, 0, { id: 'txt_' + Date.now(), type: 'text', text: ')' , context: 'method'});
                        }
                        return scope.tokens[insertIndex];
                    }
                    return token;
                }

                // ---------- 辅助插入方法 ----------
                function insertTextAndPlaceholder(afterToken, text) {
                    var idx = scope.tokens.indexOf(afterToken);
                    if (idx === -1) return;
                    scope.tokens.splice(idx + 1, 0,
                        { id: 'txt_' + Date.now(), type: 'text', text: text },
                        { id: 'p_' + Date.now(), type: 'placeholder', text: '__', context: 'bom' }
                    );
                }

                function insertOperatorPlaceholder(afterToken) {
                    var idx = scope.tokens.indexOf(afterToken);
                    if (idx === -1) return;
                    scope.tokens.splice(idx + 1, 0,
                        { id: 'p_op_' + Date.now(), type: 'placeholder', text: '⚡', context: 'operator' }
                    );
                }

                function insertConditionPlaceholder(afterToken) {
                    var idx = scope.tokens.indexOf(afterToken);
                    if (idx === -1) return;
                    scope.tokens.splice(idx + 1, 0,
                        { id: 'p_cond_' + Date.now(), type: 'placeholder', text: '__', context: 'condition'}
                    );
                    if(isResultRule()){
                        scope.tokens.splice(idx + 2, 0,
                            { id: 'p_result_' + Date.now(), type: 'text', text: ';'}
                        );
                    }
                }

                function insertResultPlaceholder(afterToken) {
                    var idx = scope.tokens.indexOf(afterToken);
                    if (idx === -1) return;
                    if(isResultRule()){
                        scope.tokens.splice(idx + 2, 0,
                            { id: 'p_result_' + Date.now(), type: 'text', text: ';'}
                        );
                    }
                }

                // ---------- 占位符点击处理 ----------
                function handlePlaceholderClick(token,index) {
                    if(!scope.edit){
                        return;
                    }

                    if (token.context === 'condition') {
                        shouldMoveCursor = false;
                        // 右侧条件占位符
                        var leftNode = getLeftNode(token);
                        if (leftNode && leftNode.baseType) {
                            // 有 baseType，调用 queryBaseData
                            scope.queryBaseData({ baseType: leftNode.baseType }).then(function(data) {
                                var items = data || [];
                                showSuggestion(items, 'baseData', token, '');
                            });
                        } else {
                            // 无 baseType，可手动输入 -> 转为编辑模式
                            token.editing = true;
                            renderTokens();
                            // 创建输入框
                            var input = document.createElement('input');
                            input.className = 'paramInput';
                            input.type = 'text';
                            input.value = token.text === '__' ? '' : token.text;
                            input.style.width = '120px';
                            input.style.border = '1px solid #ccc';
                            input.style.borderRadius = '4px';
                            input.style.padding = '2px 6px';
                            input.style.fontSize = '14px';
                            // 替换占位符 DOM
                            var children = element[0].childNodes;
                            for (var i = 0; i < children.length; i++) {
                                if (children[i].dataset && children[i].dataset.tokenId == token.id) {
                                    element[0].replaceChild(input, children[i]);
                                    input.focus();
                                    input.select();
                                    break;
                                }
                            }

                            input.addEventListener('blur', function() {
                                token.text = input.value || '__';
                                token.editing = false;
                                if(token.propertyType && (isDateType(token.propertyType) || isStringType(token.propertyType))) {
                                    token.dataRef = {property:'"' + input.value + '"'};
                                }
                                suggestion.targetToken = null;

                                // 校验
                                validateCondition(token);
                                shouldMoveCursor = true;
                                renderTokens();
                                scope.$apply();
                            });
                            input.addEventListener('keydown', function(e) {
                                if (e.key === 'Enter') input.blur();
                            });
                        }
                        return;
                    }

                    // 运算符占位符
                    if (token.context === 'operator') {
                        var leftNode = getLeftNode(token);
                        // 如果左侧是 method 且 void，则不弹出运算符列表，直接重置上下文
                        if (leftNode && leftNode.type === 'method' && leftNode.propertyType === 'void') {
                            hideSuggestion();
                            suggestion.targetToken = null;
                            suggestion.mode = 'bom';
                            resetContext();
                            return;
                        }
                        if (leftNode) {
                            var filtered = filterOperators(leftNode.propertyType);
                            if (filtered.length > 0) {
                                showSuggestion(filtered, 'operator', token, '');
                            } else {
                                hideSuggestion();
                                suggestion.targetToken = null;
                                suggestion.mode = 'bom';
                                resetContext();
                            }
                        }
                        return;
                    }

                    // 默认 BOM 树
                    showSuggestion(currentContext, 'bom', token, '');
                }

                /**
                 * 从指定下标向前查找匹配的元素
                 * @param {Array} arr - 目标数组
                 * @param {number} startIndex - 开始查找的下标（包含该下标本身）
                 * @param {Function} predicate - 匹配条件函数 (item, index) => boolean
                 * @returns {*} 匹配的元素，未找到返回 undefined
                 */
                function findPrev(arr, startIndex, predicate) {
                    // 边界处理：如果下标越界，从数组末尾开始；如果小于0，直接返回
                    let i = Math.min(startIndex, arr.length - 1);
                    for (; i >= 0; i--) {
                        if (predicate(arr[i], i)) {
                            return i;
                        }
                    }
                    return undefined;
                }

                // ---------- 条件值校验 ----------
                function validateCondition(token) {
                    var leftNode = getLeftNode(token);
                    if (!leftNode) return;
                    var propType = leftNode.propertyType;
                    var val = token.text;
                    if (val === '__' || val === '') {
                        token.error = false;
                        return;
                    }
                    if (isNumberType(propType)) {
                        if (isNaN(parseFloat(val))) {
                            token.error = true;
                            token.errorMsg = '请输入有效数字';
                        } else {
                            token.error = false;
                        }
                    } else if (isDateType(propType)) {
                        if (isNaN(Date.parse(val))) {
                            token.error = true;
                            token.errorMsg = '请输入有效日期';
                        } else {
                            token.error = false;
                        }
                    } else {
                        token.error = false;
                    }
                }

                // ---------- 统一的提示项渲染函数 ----------
                function renderSuggestionItems(items, mode) {
                    if (!suggestionEl) return;
                    suggestionEl.innerHTML = '';

                    angular.forEach(items, function (item) {
                        var div = document.createElement('div');
                        div.className = 'suggestion-item';

                        var icon = '';
                        if (mode === 'bom') {
                            icon = item.type === 'property' ? '🟢' : (item.type === 'method' ? '⚪' : '🔵');
                        } else if (mode === 'operator') {
                            icon = '⚡';
                        } else if (mode === 'baseData') {
                            icon = '📋';
                        }

                        div.innerHTML = `<span class="item-icon">${icon}</span>` +
                            `<span class="item-text">${item.name || item.metaRuleName || item.label || ''}</span>`;

                        // ★ 关键：每个 div 闭包绑定它对应的 item
                        div.addEventListener('click', function () {
                            selectSuggestion(item);
                        });

                        suggestionEl.appendChild(div);
                    });

                    if (items.length === 0) {
                        var empty = document.createElement('div');
                        empty.className = 'suggestion-item';
                        empty.textContent = '无匹配项';
                        empty.style.cursor = 'default';
                        empty.style.color = '#999';
                        suggestionEl.appendChild(empty);
                    }
                }

                // ---------- 输入事件 ----------
                element.on('input', function(event,type) {
                    if(event.target.className == 'paramInput' || !scope.edit){
                        return;
                    }
                    var textContent = element.text();
                    // 检测是否输入了空格
                    if (textContent.endsWith(' ')) {
                        // 获取当前光标位置
                        var sel = window.getSelection();
                        if (sel.rangeCount === 0) return;
                        var range = sel.getRangeAt(0);

                        // 确定当前上下文
                        // 如果当前有选中的占位符，则使用其上下文，否则使用 currentContext
                        var targetToken = suggestion.targetToken;
                        var context = targetToken ? targetToken.context : 'bom';
                        var items = [];

                        if (context === 'bom') {
                            items = currentContext;
                        } else if (context === 'operator') {
                            var leftNode = getLeftNode(targetToken);
                            if (leftNode) {
                                items = filterOperators(leftNode.propertyType);
                            }
                        } else if (context === 'baseData') {
                            // 由点击触发
                        }

                        // 计算提示框位置（使用 $timeout 延迟，确保选区稳定）
                        $timeout(function() {
                            var rect = range.getBoundingClientRect();
                            var editorRect = editorEl.getBoundingClientRect();
                            suggestion.top = rect.bottom - editorRect.top + 10;
                            suggestion.left = rect.left - editorRect.left;
                            if (suggestionEl) {
                                suggestionEl.style.top = suggestion.top + 'px';
                                suggestionEl.style.left = suggestion.left + 'px';
                            }
                        }, 0);

                        showSuggestion(items, context, targetToken, '');
                    } else if (isCustomerText(textContent)){
                        var tempText = getCustomerText(textContent);
                        var lastToken = scope.tokens[scope.tokens.length - 1];
                        if(!lastToken || lastToken.text != tempText){
                            var textToken = {
                                id: 'txt_' + Date.now(),
                                "type": "text",
                                "text": tempText
                            };
                            scope.tokens.push(textToken);
                            resetContext();
                            renderTokens();
                        }
                    } else {
                        // 非空格输入，如果提示框已显示，则进行模糊匹配
                        if (suggestion.visible) {
                            // 获取当前输入的搜索词（从光标前的文本中提取）
                            var sel = window.getSelection();
                            if (sel.rangeCount > 0) {
                                var range = sel.getRangeAt(0);
                                var node = range.startContainer;
                                var text = node.textContent || '';
                                var beforeCaret = text.substring(0, range.startOffset);
                                // 查找最后一个空格后的文本
                                var lastSpace = beforeCaret.lastIndexOf(' ');
                                var searchText = lastSpace !== -1 ? beforeCaret.substring(lastSpace + 1) : beforeCaret;
                                // 更新提示框过滤
                                if (suggestionEl) {
                                    var items = suggestion.items;
                                    var filtered = items.filter(function(item) {
                                        var label = item.name || item.metaRuleName || item.label || '';
                                        return label.toLowerCase().indexOf(searchText.toLowerCase()) !== -1;
                                    });

                                    // ★ 关键改动：重建 DOM，每个节点闭包新的 item
                                    renderSuggestionItems(filtered, suggestion.mode);
                                }
                            }
                        }
                    }

                    // 每次输入后重建上下文（用于删除文本后恢复）
                    $timeout(function() {
                        rebuildContext();
                        updatePlaceholder();
                    }, 100);
                });

                // ---------- 键盘事件 ----------
                element.on('keydown', function(e) {
                    if (e.key === 'Enter'){
                        e.preventDefault();
                        // 向 tokens 末尾追加一个换行 token
                        scope.tokens.push({
                            id: 'nl_' + Date.now(),
                            type: 'newline',
                            text: '\n'
                        });
                        resetContext();
                        if (!scope.$$phase && !scope.$$destroyed) {
                            scope.$apply();
                            // renderTokens();
                        }
                        return;
                    }
                    if (e.key === 'Escape') hideSuggestion();
                });

                // ---------- 监听 tokens ----------
                scope.$watch('tokens', function(newVal) {
                    renderTokens();
                    if (!newVal || newVal.length <= 0) {
                        // tokens 被清空（如点击清空按钮），重置内部上下文
                        resetContext();
                        hideSuggestion();
                        // 清空选中节点标记（如果有）
                        suggestion.targetToken = null;
                        suggestion.mode = 'bom';
                    }
                    updatePlaceholder();
                }, true);

                // ---------- 清理 ----------
                scope.$on('$destroy', function() {
                    element.off('input');
                    element.off('keydown');
                    if (suggestionEl) {
                        suggestionEl.remove();
                        suggestionEl = null;
                    }
                });

                // ---------- 对外 API ----------
                scope.clearEditor = function() {
                    scope.tokens = [];
                    hideSuggestion();
                    resetContext();
                    renderTokens();
                };

                // 初始渲染
                resetContext();
                renderTokens();
            }
        };
    }]);
});