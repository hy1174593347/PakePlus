angular.module('myApp.tree', [])
.directive('treeView', function($timeout) {
    return {
        restrict: 'E',
        scope: {
            ngModel: '=',
            treeData: '=',           // 树形数据
            checkBox: '@',
            labelKey: '@',           // 显示名称的字段名
            ngSelect: '&'            // 选中节点时的回调，参数 { node: 选中节点 }
        },
        template: `
            <div class="tree-view">
                <tree-node
                    ng-repeat="node in treeData track by $index"
                    node="node" check-box="{{checkBox}}"
                    label-key="{{labelKey}}"
                    select="select">
                </tree-node>
            </div>
        `,
        link: function (scope) {
            // 定义 cusSelect 方法，暴露给子节点
            scope.select = function (tempNode) {
                if(scope.ngModel !== undefined){
                    scope.ngModel.selected = !scope.ngModel.selected;
                }
                scope.ngModel = tempNode;
                if (scope.ngSelect) {
                    $timeout(function () {
                        scope.ngSelect();
                    }, 10);
                }
            };
        }
    };
})
.directive('treeNode', function($document, $timeout) {
    return {
        restrict: 'E',
        scope: {
            node: '=',
            checkBox: '@',
            labelKey: '@',
            select: '='
        },
        template: `
            <div class="tree-node">
                <div class="node-content" ng-click="selectNode()" ng-class="{ 'selected': node.selected === true }">
                    <span class="toggle-icon" ng-if="(node.children && node.children.length > 0) || (node.catalogueRels && node.catalogueRels.length > 0)" ng-click="toggle($event)">
                        {{ node.collapsed ? '+' : '-' }}
                    </span>
                    <span ng-if="node && node.catalogue">
                    📁
                    </span>
                    <span ng-if="node && node.ruleId">
                    📀
                    </span>
                    <span ng-if="node && node.idRuleTable">
                    📊
                    </span>
                    <span ng-if="node && node[labelKey] && checkBox">
                        <input type="checkbox" ng-model="node.checked" ng-click="checkAllNode(node)"/>
                    </span>
                    {{ node[labelKey] }}
                </div>
                <div class="node-children" ng-if="!node.collapsed">
                    <div ng-if="node.children && node.children.length > 0">
                        <tree-node
                            ng-repeat="child in node.children track by $index"
                            node="child" check-box="{{checkBox}}"
                            label-key="{{labelKey}}"
                            select="select">
                        </tree-node>
                    </div>
                    <div ng-if="node.catalogueRels && node.catalogueRels.length > 0">
                        <tree-node
                            ng-repeat="child in node.catalogueRels track by $index"
                            node="child" check-box="{{checkBox}}"
                            label-key="{{labelKey}}"
                            select="select">
                        </tree-node>
                    </div>
                </div>
            </div>
        `,
        link: function(scope) {
            if (scope.node.collapsed === undefined) {
                scope.node.collapsed = true;
            }

            scope.toggle = function($event) {
                $event.stopPropagation();
                if ((scope.node.children && scope.node.children.length > 0) || (scope.node.catalogueRels && scope.node.catalogueRels.length > 0)) {
                    scope.node.collapsed = !scope.node.collapsed;
                }
            };

            scope.selectNode = function() {
                scope.node.selected = !scope.node.selected;
                // 触发 cusSelect 回调（确保 ngModel 已同步）
                if (scope.select) {
                    scope.select(scope.node);
                }
            };

            scope.checkAllNode = function(node){
                var checked = !node.checked;
                checkedAll(node,checked);
            }

            function checkedAll(node,checked){
                _.each(node.children,function(item){
                    item.checked = checked;
                    checkedAll(item,checked);
                });

                _.each(node.catalogueRels,function(item){
                    item.checked = checked;
                });
            }
        }
    };
});