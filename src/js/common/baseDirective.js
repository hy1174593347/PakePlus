define(function (require, exports, module) {
	require('common/base').init();
	var md = angular.module('yxDirective', ['yxBase']);
	md.directive('relationSelect', function (baseService) {
		return {
			require: 'ngModel',
			link: function (scope, element, attrs) {
				var ngModel = attrs['ngModel'];
				var relationSelect = attrs['relationSelect'];
				var cvalue = attrs['cvalue'];
				var baseCode = attrs['baseCode'] || 'baseCode';

				//监听，当父模型的值改变时，同时改变子选项的值
				scope.$watch(ngModel, function () {
					var parentModelCode = baseService.getValue(ngModel, scope);

					if (!cvalue) return;

					if (!parentModelCode) {
						baseService.setValue(cvalue, scope, []);
					} else {
						var parentOptions = baseService.getValue(relationSelect, scope);
						var parentModel = _.find(parentOptions, { baseCode: parentModelCode });
						baseService.setValue(cvalue, scope, parentModel.children);
					}
				});
			}
		};
	});

	md.directive('customSelect', function ($document, $timeout,customSelectRegistry) {
		return {
			restrict: 'E',
			scope: {
				ngModel: '=',
				options: '=',
				labelKey: '@',
				valueKey: '@',
				placeholder: '@',
				multiple: '=?',
				searchable: '=?',
				disabled: '=?',
				ngChange: '&'
			},
			template: `
                        <div class="custom-select-wrapper" ng-class="{ 'is-disabled': disabled }">
                            <div class="custom-select-input" ng-click="toggleDropdown($event)" ng-class="{ 'open': isOpen }">
                                <!-- 多选标签（带边框和X） -->
                                <span class="select-tag" ng-repeat="item in selectedItems track by item[valueKey]" ng-if="multiple">
                                    <span class="tag-text">{{ item[labelKey] }}</span>
                                    <button type="button" class="remove-btn" ng-click="removeItem(item, $event)">&times;</button>
                                </span>

                                <!-- 单选显示选中文本（无边框） -->
                                <span class="single-selected-text" ng-if="!multiple" ng-show="selectedItems.length === 1 && !searchText && !isOpen">
                                    {{ selectedItems[0][labelKey] }}
                                </span>

                                <!-- 搜索输入框 -->
                                <input type="text"
                                    class="search-input"
                                    ng-class="{ 'multi': multiple }"
                                    ng-model="searchModel.text"
									ng-change="filterOptions()"
									ng-show="searchable && (selectedItems.length === 0 || isOpen)"
                                    placeholder="{{ !multiple && selectedItems.length === 1 && !searchText && !isOpen ? '' : placeholder }}"
                                    autocomplete="off"
                                />
                                
                                <!-- 无搜索时显示占位 -->
                                <span class="placeholder-text" ng-if="!searchable && (selectedItems.length === 0 || isOpen)">
                                    {{ placeholder }}
                                </span>

                                <span class="arrow-icon" ng-class="{ 'open': isOpen }">&#9662;</span>
                            </div>

                            <div class="custom-select-dropdown" ng-class="{ 'open': isOpen }">
                                <div class="select-option"
                                    ng-repeat="item in filteredOptions track by item[valueKey]"
                                    ng-class="{ 'selected': isSelected(item) }"
                                    ng-click="selectOption(item, $event)">
                                    {{ item[labelKey] }}
                                    <span class="option-check" ng-if="item.checked">&#10003;</span>
                                </div>
                                <div class="no-options" ng-if="filteredOptions.length === 0">
                                    无匹配选项
                                </div>
                            </div>
                        </div>
                    `,
			link: function (scope, element, attrs) {
				// 默认值
				scope.multiple = scope.multiple || false;
				scope.searchable = (scope.searchable !== undefined) ? scope.searchable : true;
				scope.labelKey = scope.labelKey || 'label';
				scope.valueKey = scope.valueKey || 'value';
				scope.placeholder = scope.placeholder || '请选择';
				scope.isOpen = false;
				scope.searchModel = { text: '' };
				scope.selectedItems = [];

				// 过滤选项（模糊匹配，忽略大小写）
				scope.filterOptions = function () {
					var search = scope.searchModel.text ? scope.searchModel.text.trim() : '';
					var all = scope.options || [];
					if (search) {
						scope.filteredOptions = all.filter(function (item) {
							return item[scope.labelKey].indexOf(search) !== -1;
						});
					} else {
						scope.filteredOptions = angular.copy(all);
					}
				}

				// 同步选中项
				function syncSelectedItems() {
					(scope.options || []).forEach(function (opt) {
						opt.checked = false;
					});
					if (scope.multiple) {
						if (!angular.isArray(scope.ngModel)) {
							scope.ngModel = [];
						}
						scope.selectedItems = (scope.options || []).filter(function (opt) {
							var isSelected = scope.ngModel.indexOf(opt[scope.valueKey]) !== -1;
							if (isSelected) opt.checked = true;
							return isSelected;
						});
					} else {
						if (scope.ngModel !== undefined && scope.ngModel !== null) {
							var found = (scope.options || []).filter(function (opt) {
								if (opt[scope.valueKey] === scope.ngModel) {
									opt.checked = true;
									return true;
								}
								return false;
							});
							scope.selectedItems = found.length ? [found[0]] : [];
						} else {
							scope.selectedItems = [];
						}
					}
					scope.filterOptions();
				}

				// 选择选项
				scope.selectOption = function (item, $event) {
					if ($event) $event.stopPropagation();

					if (scope.multiple) {
						var idx = scope.ngModel.indexOf(item[scope.valueKey]);
						if (idx === -1) {
							item.checked = true;
							scope.ngModel.push(item[scope.valueKey]);
						} else {
							item.checked = false;
							scope.ngModel.splice(idx, 1);
						}
					} else {
						item.checked = true;
						scope.isOpen = false;
						scope.searchModel.text = '';

						if(scope.ngModel === item[scope.valueKey]){
							syncSelectedItems();
							return;
						}
						scope.ngModel = item[scope.valueKey];
					}

					// 保留搜索词，重新同步
					syncSelectedItems();

					if (scope.ngChange) {
						$timeout(function() {
							scope.ngChange();
						},10);
					}
				};

				// 移除多选中的某一项
				scope.removeItem = function (item, $event) {
					$event.stopPropagation();
					if (scope.multiple) {
						var idx = scope.ngModel.indexOf(item[scope.valueKey]);
						if (idx !== -1) {
							item.checked = false;
							scope.ngModel.splice(idx, 1);
							syncSelectedItems();
						}
					}
				};

				// 切换下拉
				scope.toggleDropdown = function ($event) {
					if (scope.disabled) return;
					$event.stopPropagation();
					scope.isOpen = !scope.isOpen;
					if (scope.isOpen) {
						scope.filterOptions();
						$timeout(function () {
							var searchInput = element[0].querySelector('.search-input');
							if (searchInput) searchInput.focus();
						}, 50);
					} else {
						scope.searchModel.text = '';
						scope.filterOptions();
					}
				};

				// 点击外部关闭
				var clickHandler = function (event) {
					if (!element[0].contains(event.target)) {
						scope.$apply(function () {
							scope.isOpen = false;
							scope.searchModel.text = '';
							scope.filterOptions();
						});
					}
				};
				$document.on('click', clickHandler);

				// ★ 优化 1：去掉 options 的深度监听
				// 只在 options 引用变化时同步（浅监听），因为下拉选项列表通常是只读的
				scope.$watch('options', function (newVal, oldVal) {
					if (newVal !== oldVal) syncSelectedItems();
				});   // 注意：不传 true

				// ★ 优化 2：ngModel 也改为浅监听
				scope.$watch('ngModel', function (newVal, oldVal) {
					if (newVal !== oldVal) syncSelectedItems();
				}, true);  // 多选时是数组，但变化时一定是新引用，不需要 deep

				// ★ 优化 3：共享 document click 监听器
				// 通过单例服务统一注册一次 click，遍历所有已打开的实例
				var instanceId = customSelectRegistry.register(scope, element, function () {
					scope.$apply(function () {
						scope.isOpen = false;
						scope.searchModel.text = '';
						scope.filterOptions();
					});
				});

				// 监听多选模式变化
				scope.$watch('multiple', function (newVal) {
					syncSelectedItems();
				});

				// 清理
				scope.$on('$destroy', function () {
					customSelectRegistry.unregister(instanceId);
				});

				// 初始化
				syncSelectedItems();
			}
		};
	});

	// 新增：下拉框注册表（单例），统一管理 document click
	md.factory('customSelectRegistry', function ($document) {
		var instances = {};      // id -> { scope, element, closeFn }
		var counter = 0;
		var bound = false;

		function onDocumentClick(event) {
			Object.keys(instances).forEach(function (id) {
				var inst = instances[id];
				// 只处理已打开的实例
				if (inst.scope.isOpen && !inst.element[0].contains(event.target)) {
					inst.closeFn();
				}
			});
		}

		return {
			register: function (scope, element, closeFn) {
				var id = 'cs_' + (++counter);
				instances[id] = { scope: scope, element: element, closeFn: closeFn };
				if (!bound) {
					$document.on('click', onDocumentClick);
					bound = true;
				}
				return id;
			},
			unregister: function (id) {
				delete instances[id];
				if (Object.keys(instances).length === 0 && bound) {
					$document.off('click', onDocumentClick);
					bound = false;
				}
			}
		};
	});

	md.directive('customTreeSelect', ['$document', '$timeout', function ($document, $timeout) {
		// ---------- 单例：所有实例共享一个 document 点击监听 ----------
		var instances = {};
		var counter = 0;
		var bound = false;

		function onDocClick(event) {
			Object.keys(instances).forEach(function (id) {
				var inst = instances[id];
				if (!inst.scope.isOpen) return;
				var clickedInsideInput = inst.element[0].contains(event.target);
				var clickedInsidePanel = inst.panel.contains(event.target);
				if (!clickedInsideInput && !clickedInsidePanel) {
					inst.close();
				}
			});
		}

		return {
			restrict: 'E',
			scope: {
				ngModel: '=',          // 显示值（node[labelKey]，如 pathName）
				pathModel: '=?',       // 存储值（node[valueKey]，如 path）
				treeData: '=',         // bomTree 树形数据
				labelKey: '@',         // 显示字段，默认 'pathName'
				valueKey: '@',         // 值字段，默认 'path'
				placeholder: '@',
				disabled: '=?'
			},
			template: `
                <div class="custom-tree-select-wrapper" ng-class="{ 'is-disabled': disabled }">
                    <input type="text"
                           class="custom-tree-select-input"
                           ng-model="searchText"
                           ng-disabled="disabled"
                           ng-focus="onFocus()"
                           ng-blur="onBlur()"
                           ng-change="onInputChange()"
                           placeholder="{{placeholder || '请选择'}}"
                           autocomplete="off" />
                    <span class="custom-tree-select-arrow">&#9662;</span>
                </div>
            `,
			link: function (scope, element, attrs) {
				// ---------- 默认值 ----------
				scope.labelKey = scope.labelKey || 'pathName';
				scope.valueKey = scope.valueKey || 'path';
				scope.isOpen = false;

				var flatData = [];        // 扁平化的树
				var selectedPath = null;  // 当前选中的 path（用于高亮和同步）

				// ---------- 树的扁平化（带 level 用于缩进） ----------
				function flatten(tree, level, parentKey, result) {
					level = level || 0;
					parentKey = parentKey || '';
					result = result || [];
					(tree || []).forEach(function (node) {
						var key = parentKey ? parentKey + '/' + node[scope.valueKey] : node[scope.valueKey];
						result.push({
							name: node[scope.labelKey],
							path: node[scope.valueKey],
							key: key,
							level: level
						});
						if (node.children && node.children.length) {
							flatten(node.children, level + 1, key, result);
						}
					});
					return result;
				}

				// ---------- 模糊过滤：保留匹配项及其所有祖先 ----------
				function filterFlat(list, keyword) {
					if (!keyword) return list;
					var kw = keyword.toLowerCase();
					var visibleKeys = {};
					list.forEach(function (item) {
						if (String(item.name).toLowerCase().indexOf(kw) !== -1) {
							var parts = item.key.split('/');
							var cur = '';
							parts.forEach(function (p) {
								cur = cur ? cur + '/' + p : p;
								visibleKeys[cur] = true;
							});
						}
					});
					return list.filter(function (item) { return visibleKeys[item.key]; });
				}

				// ---------- 面板（附加到 body，避免被 overflow 裁剪） ----------
				var panel = document.createElement('div');
				panel.className = 'custom-tree-select-panel';
				panel.style.display = 'none';
				document.body.appendChild(panel);

				function renderPanel(keyword) {
					var list = filterFlat(flatData, keyword);
					panel.innerHTML = '';
					if (list.length === 0) {
						var empty = document.createElement('div');
						empty.className = 'custom-tree-select-empty';
						empty.textContent = '无匹配项，可直接输入';
						panel.appendChild(empty);
						return;
					}
					var fragment = document.createDocumentFragment();
					list.forEach(function (item) {
						var div = document.createElement('div');
						div.className = 'custom-tree-select-item';
						if (item.path === selectedPath) div.classList.add('selected');
						div.style.paddingLeft = (12 + item.level * 18) + 'px';
						div.textContent = item.name;
						// ★ 用 mousedown 而非 click，避免 input blur 抢先
						div.addEventListener('mousedown', function (e) {
							e.preventDefault();
							e.stopPropagation();
							selectItem(item);
						});
						fragment.appendChild(div);
					});
					panel.appendChild(fragment);
				}

				function showPanel() {
					if (scope.disabled) return;
					var rect = element[0].getBoundingClientRect();
					panel.style.left = rect.left + 'px';
					panel.style.top = (rect.bottom + 2) + 'px';
					panel.style.width = rect.width + 'px';
					panel.style.display = 'block';
					renderPanel('');
					scope.isOpen = true;
					if (!scope.$$phase && !scope.$$destroyed) scope.$applyAsync();
				}

				function hidePanel() {
					panel.style.display = 'none';
					scope.isOpen = false;
				}

				// ---------- 选择某项 ----------
				function selectItem(item) {
					selectedPath = item.path;
					scope.ngModel = item.name;
					if (attrs.pathModel !== undefined) {
						scope.pathModel = item.path;
					}
					scope.searchText = item.name;
					hidePanel();
					if (!scope.$$phase && !scope.$$destroyed) scope.$apply();
				}

				// ---------- 事件 ----------
				scope.onFocus = function () {
					// 聚焦时把当前值填入输入框，并反查 path
					scope.searchText = scope.ngModel || '';
					selectedPath = null;
					for (var i = 0; i < flatData.length; i++) {
						if (flatData[i].name === scope.ngModel) {
							selectedPath = flatData[i].path;
							break;
						}
					}
					showPanel();
				};

				scope.onBlur = function () {
					// 延迟处理，让面板 mousedown 先执行（选中项不被覆盖）
					$timeout(function () {
						if (!scope.isOpen) return;
						// 若用户未选择、但输入了文本 → 视为自由输入
						if (scope.searchText !== scope.ngModel) {
							scope.ngModel = scope.searchText;
							if (attrs.pathModel !== undefined && !selectedPath) {
								scope.pathModel = scope.searchText;
							}
						}
						hidePanel();
					}, 150);
				};

				scope.onInputChange = function () {
					// 手动输入 → 清空选中
					selectedPath = null;
					if (scope.isOpen) {
						renderPanel(scope.searchText);
					} else {
						showPanel();
						// 输入完后面板显示按关键字过滤
						renderPanel(scope.searchText);
					}
				};

				// ---------- 注册到单例 ----------
				var instanceId = 'cts_' + (++counter);
				instances[instanceId] = {
					scope: scope,
					element: element,
					panel: panel,
					close: function () {
						scope.$apply(function () {
							// 点击外部时，若输入框有文本但未选中，按自由输入处理
							if (scope.searchText !== scope.ngModel) {
								scope.ngModel = scope.searchText;
								if (attrs.pathModel !== undefined && !selectedPath) {
									scope.pathModel = scope.searchText;
								}
							}
							hidePanel();
						});
					}
				};
				if (!bound) {
					$document.on('mousedown', onDocClick);
					bound = true;
				}

				// ---------- 数据监听 ----------
				scope.$watch('treeData', function (newVal) {
					if (newVal) {
						flatData = flatten(newVal, 0, '', []);
					}
				});

				scope.$watch('ngModel', function (newVal) {
					if (newVal !== undefined && newVal !== null && newVal !== scope.searchText) {
						scope.searchText = newVal;
					}
				});

				// ---------- 清理 ----------
				scope.$on('$destroy', function () {
					delete instances[instanceId];
					if (Object.keys(instances).length === 0 && bound) {
						$document.off('mousedown', onDocClick);
						bound = false;
					}
					if (panel.parentNode) panel.parentNode.removeChild(panel);
				});

				// ---------- 初始化 ----------
				scope.searchText = scope.ngModel || '';
				if (scope.treeData) {
					flatData = flatten(scope.treeData, 0, '', []);
				}
			}
		};
	}]);
});