define(function (require, exports, module) {
    require('common/base').init();
    var md = angular.module('flowDirective', ['yxBase']);

    md.directive('logicFlow', ['$timeout', function($timeout) {
        return {
            restrict: 'E',
            scope: {
                graphData: '=',
                lf: '=',
                options: '=',
                onNodeClick: '&',
                onEdgeClick: '&',
                onChooseChild: '&',
                onChooseRule: '&',
                onDataChange: '&'   // 数据变化回调
            },
            link: function(scope, element, attrs) {
                var container = element[0];
                var lf = null;
                var isUpdating = false; // 防止循环更新

                function initLogicFlow() {
                    const { Dagre } = Layout;
                    LogicFlow.use(DndPanel);
                    LogicFlow.use(Menu);
                    LogicFlow.use(Dagre);

                    var config = angular.extend({
                        container: container,
                        grid: {
                            size: 20,
                            visible: true,
                            type: 'dot',
                            config: {
                                color: '#ababab',
                                thickness: 1
                            }
                        },
                        edgeType: 'bezier',
                        keyboard: {
                            enabled: true,
                        }
                    }, scope.options || {});

                    lf = new LogicFlow(config);

                    lf.setTheme({
                        baseNode:{
                            stroke: '#1890ff'
                        },
                        baseEdge:{
                            stroke: '#1890ff'
                        },
                        rect: {
                            radius: 5,
                        }
                    });

                    lf.addMenuConfig({
                        // 节点右键菜单
                        nodeMenu: [
                            {
                                text: '绑定子流',
                                callback(node) {
                                    if (scope.onChooseChild) {
                                        scope.$apply(function () { scope.onChooseChild({ node: node }); });
                                    }
                                }
                            },
                            {
                                text: '绑定规则',
                                callback(node) {
                                    if (scope.onChooseRule) {
                                        scope.$apply(function () { scope.onChooseRule({ node: node,type:'node' }); });
                                    }
                                }
                            }
                        ],
                        // 节点右键菜单
                        edgeMenu: [
                            {
                                text: '绑定规则',
                                callback(edge) {
                                    if (scope.onChooseRule) {
                                        scope.$apply(function () { scope.onChooseRule({ node: edge,type:'edge' }); });
                                    }
                                }
                            }
                        ]
                    });


                    // 监听事件
                    lf.on('node:click', function(data) {
                        if (scope.onNodeClick) {
                            scope.$apply(function() { scope.onNodeClick({ node: data.data }); });
                        }
                    });

                    lf.on('edge:click', function(data) {
                        if (scope.onEdgeClick) {
                            scope.$apply(function() { scope.onEdgeClick({ node: data.data }); });
                        }
                    });

                    // 也可以监听 node:drag 等

                    // 拖拽插件
                    lf.extension.dndPanel.setPatternItems([
                        {
                            type: 'circle',
                            text: '开始',
                            label: '开始节点',
                            icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAAH6ji2bAAAABGdBTUEAALGPC/xhBQAAAnBJREFUOBGdVL1rU1EcPfdGBddmaZLiEhdx1MHZQXApraCzQ7GKLgoRBxMfcRELuihWKcXFRcEWF8HBf0DdDCKYRZpnl7p0svLe9Zzbd29eQhTbC8nv+9zf130AT63jvooOGS8Vf9Nt5zxba7sXQwODfkWpkbjTQfCGUd9gIp3uuPP8bZ946g56dYQvnBg+b1HB8VIQmMFrazKcKSvFW2dQTxJnJdQ77urmXWOMBCmXM2Rke4S7UAW+/8ywwFoewmBps2tu7mbTdp8VMOkIRAkKfrVawalJTtIliclFbaOBqa0M2xImHeVIfd/nKAfVq/LGnPss5Kh00VEdSzfwnBXPUpmykNss4lUI9C1ga+8PNrBD5YeqRY2Zz8PhjooIbfJXjowvQJBqkmEkVnktWhwu2SM7SMx7Cj0N9IC0oQXRo8xwAGzQms+xrB/nNSUWVveI48ayrFGyC2+E2C+aWrZHXvOuz+CiV6iycWe1Rd1Q6+QUG07nb5SbPrL4426d+9E1axKjY3AoRrlEeSQo2Eu0T6BWAAr6COhTcWjRaYfKG5csnvytvUr/WY4rrPMB53Uo7jZRjXaG6/CFfNMaXEu75nG47X+oepU7PKJvvzGDY1YLSKHJrK7vFUwXKkaxwhCW3u+sDFMVrIju54RYYbFKpALZAo7sB6wcKyyrd+aBMryMT2gPyD6GsQoRFkGHr14TthZni9ck0z+Pnmee460mHXbRAypKNy3nuMdrWgVKj8YVV8E7PSzp1BZ9SJnJAsXdryw/h5ctboUVi4AFiCd+lQaYMw5z3LGTBKjLQOeUF35k89f58Vv/tGh+l+PE/wG0rgfIUbZK5AAAAABJRU5ErkJggg==',
                        },
                        {
                            type: 'rect',
                            label: '规则节点',
                            icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iOTQiIGhlaWdodD0iOTQiIHg9IjMiIHk9IjMiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzNiODJmNiIgc3Ryb2tlLXdpZHRoPSI2Ii8+PC9zdmc+',
                        },
                        // {
                        //     type: 'diamond',
                        //     label: '分支节点',
                        //     icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAVCAYAAAHeEJUAAAAABGdBTUEAALGPC/xhBQAAAvVJREFUOBGNVEFrE0EU/mY3bQoiFlOkaUJrQUQoWMGePLX24EH0IIoHKQiCV0G8iE1covgLiqA/QTzVm1JPogc9tIJYFaQtlhQxqYjSpunu+L7JvmUTU3AgmTfvffPNN++9WSA1DO182f6xwILzD5btfAoQmwL5KJEwiQyVbSVZ0IgRyV6PTpIJ81E5ZvqfHQR0HUOBHW4L5Et2kQ6Zf7iAOhTFAA8s0pEP7AXO1uAA52SbqGk6h/6J45LaLhO64ByfcUzM39V7ZiAdS2yCePPEIQYvTUHqM/n7dgQNfBKWPjpF4ISk8q3J4nB11qw6X8l+FsF3EhlkEMfrjIer3wJTLwS2aCNcj4DbGxXTw00JmAuO+Ni6bBxVUCvS5d9aa04+so4pHW5jLTywuXAL7jJ+D06sl82Sgl2JuVBQn498zkc2bGKxULHjCnSMadBKYDYYHAtsby1EQ5lNGrQd4Y3v4Zo0XdGEmDno46yCM9Tk+RiJmUYHS/aXHPNTcjxcbTFna000PFJHIVZ5lFRqRpJWk9/+QtlOUYJj9HG5pVFEU7zqIYDVsw2s+AJaD8wTd2umgSCCyUxgGsS1Y6TBwXQQTFuZaHcd8gAGioE90hlsY+wMcs30RduYtxanjMGal8H5dMW67dmT1JFtYUEe8LiQLRsPZ6IIc7A4J5tqco3T0pnv/4u0kyzrYUq7gASuEyI8VXKvB9Odytv6jS/PNaZBln0nioJG/AVQRZvApOdhjj3Jt8QC8Im09SafwdBdvIpztpxWxpeKCC+EsFdS8DCyuCn2munFpL7ctHKp+Xc5cMybeIyMAN33SPL3ZR9QV1XVwLyzHm6Iv0/yeUuUb7PPlZC4D4HZkeu6dpF4v9j9MreGtMbxMMRLIcjJic9yHi7WQ3yVKzZVWUr5UrViJvn1FfUlwe/KYVfYyWRLSGNu16hR01U9IacajXPei0wx/5BqgInvJN+MMNtNme7ReU9SBbgntovn0kKHpFg7UogZvaZiOue/q1SBo9ktHzQAAAAASUVORK5CYII=',
                        // },
                        {
                            type: 'circle',
                            text: '结束',
                            label: '结束节点',
                            icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAAH6ji2bAAAABGdBTUEAALGPC/xhBQAAA1BJREFUOBFtVE1IVUEYPXOf+tq40Y3vPcmFIdSjIorWoRG0ERWUgnb5FwVhYQSl72oUoZAboxKNFtWiwKRN0M+jpfSzqJAQclHo001tKkjl3emc8V69igP3znzfnO/M9zcDcKT67azmjYWTwl9Vn7Vumeqzj1DVb6cleQY4oAVnIOPb+mKAGxQmKI5CWNJ2aLPatxWa3aB9K7/fB+/Z0jUF6TmMlFLQqrkECWQzOZxYGjTlOl8eeKaIY5yHnFn486xBustDjWT6dG7pmjHOJd+33t0iitTPkK6tEvjxq4h2MozQ6WFSX/LkDUGfFwfhEZj1Auz/U4pyAi5Sznd7uKzznXeVHlI/Aywmk6j7fsUsEuCGADrWARXXwjxWQsUbIupDHJI7kF5dRktg0eN81IbiZXiTESic50iwS+t1oJgL83jAiBupLDCQqwziaWSoAFSeIR3P5Xv5az00wyIn35QRYTwdSYbz8pH8fxUUAtxnFvYmEmgI0wYXUXcCCSpeEVpXlsRhBnCEATxWylL9+EKCAYhe1NGstUa6356kS9NVvt3DU2fd+Wtbm/+lSbylJqsqkSm9CRhvoJVlvKPvF1RKY/FcPn5j4UfIMLn8D4UYb54BNsilTDXKnF4CfTobA0FpoW/LSp306wkXM+XaOJhZaFkcNM82ASNAWMrhrUbRfmyeI1FvRBTpN06WKxa9BK0o2E4Pd3zfBBEwPsv9sQBnmLVbLEIZ/Xe9LYwJu/Er17W6HYVBc7vmuk0xUQ+pqxdom5Fnp55SiytXLPYoMXNM4u4SNSCFWnrVIzKG3EGyMXo6n/BQOe+bX3FClY4PwydVhthOZ9NnS+ntiLh0fxtlUJHAuGaFoVmttpVMeum0p3WEXbcll94l1wM/gZ0Ccczop77VvN2I7TlsZCsuXf1WHvWEhjO8DPtyOVg2/mvK9QqboEth+7pD6NUQC1HN/TwvydGBARi9MZSzLE4b8Ru3XhX2PBxf8E1er2A6516o0w4sIA+lwURhAON82Kwe2iDAC1Watq4XHaGQ7skLcFOtI5lDxuM2gZe6WFIotPAhbaeYlU4to5cuarF1QrcZ/lwrLaCJl66JBocYZnrNlvm2+MBCTmUymPrYZVbjdlr/BxlMjmNmNI3SAAAAAElFTkSuQmCC',
                        }
                    ]);

                    // ---------- 暴露 LogicFlow 实例给父控制器 ----------
                    // 通过父作用域共享，方便控制器调用 lf 的方法
                    scope.lf = lf;

                    // 初始渲染
                    if (scope.graphData) {
                        scope.renderGraph(scope.graphData);
                    }
                }

                scope.renderGraph = function(data) {
                    if (!lf) return;
                    lf.render(data);
                }

                // 暴露 API
                scope.getLF = function () {
                     return lf; 
                };
                scope.addNode = function (node) {
                    if (lf){
                        lf.addNode(node);
                        scope.graphData.nodes.push(edge);
                    }
                };
                scope.addEdge = function (edge) {
                     if (lf){ 
                        lf.addEdge(edge); 
                        scope.graphData.edges.push(edge);
                     }
                };

                scope.$on('$destroy', function() {
                    if (lf) {
                        lf.destroy();
                        lf = null;
                    }
                });

                // 延迟初始化，确保 DOM 渲染完成
                $timeout(initLogicFlow, 0);
            }
        };
    }]);
});