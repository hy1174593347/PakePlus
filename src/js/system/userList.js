define(function(require){
    require('../common/base').init();
    require('../common/baseDirective');
    var md = angular.module('userInfoApp',['yxBase','yxDirective']);
    md.controller('userController',function($scope,$timeout,baseService){

        function init(scope){
            scope.generateKey = baseService.getCache('generateKey');
            scope.ctrl = {};
            scope.dim = {};
            scope.addDim = {};
            scope.options = {};

            initAppData();
            initRoleData();
            if(!scope.generateKey){
                initGenerateKey();
            }
        }

        function initGenerateKey(){
            var url = "/getGenerateKey";
            var promise = baseService.httpNoModal(url,null,'get');
            promise.then(function(data){
                $scope.generateKey = data;
                baseService.setCache('generateKey',data);
            },function(data){
                console.log('获取generateKey失败：'+data);
            });
        }

        function initAppData(){
            var url = "/app/queryApps";
            var promise = baseService.httpNoModal(url,{pageNum:1,pageSize:2000});
            promise.then(function(data){
                var result = data.records || [];
                $scope.options.apps = result;
            },function(data){
				baseService.tips('获取应用列表失败：'+data,'danger',$scope);
			});
        }

        function initRoleData(){
            var url = "/userInfo/getRoles";
            var promise = baseService.httpNoModal(url,null,'get');
            promise.then(function(data){
                var result = data || [];
                $scope.options.roles = result;
            },function(data){
                baseService.tips('获取角色失败：'+data,'danger',$scope);
            });
        }

        $scope.saveUser = function(form){
            if(!baseService.validForm(form)){
                return;
            }

            var roles = _.filter($scope.options.roles,function(item){
                return $scope.addDim.role.includes(item.roleCode);
            });

            var apps = _.filter($scope.options.apps,function(item){
                return $scope.addDim.app.includes(item.idRuleApplication);
            });

            $scope.addDim.roles = roles;
            $scope.addDim.apps = apps;
            $scope.addDim.userName = $scope.addDim.username;

            var param = angular.copy($scope.addDim);
            param.loginPassword = baseService.encryptToBase64(param.loginPassword, $scope.generateKey);

            var url = $scope.addDim.idUserInfo ? "/userInfo/update" : "/userInfo/save";
            var promise = baseService.http(url,param);
            promise.then(function(data){
                baseService.tips('保存成功','success',$scope);
                baseService.modal('hide','userUpdateModal');
                $scope.queryUser();
            },function(data){
				baseService.tips('保存失败，请联系开发'+data,'danger',$scope);
			});
        }

        $scope.showUpdate = function(type,name,user){
            $scope.addDim = angular.copy(user) || {};

            if(user && user.apps && user.apps.length > 0){
                $scope.addDim.app = [];
                _.each(user.apps,function(item){
                    $scope.addDim.app.push(item.idRuleApplication);
                });
            }

            if(user && user.roles && user.roles.length > 0){
                $scope.addDim.role = [];
                _.each(user.roles,function(item){
                    $scope.addDim.role.push(item.roleCode);
                });
            }
            baseService.modal(type,name);
        }

        $scope.queryUser = function(){
            var url = "/userInfo/getUserList";
            var promise = baseService.http(url,angular.copy($scope.dim));
            promise.then(function(data){
                var result = data.records || [];
                $scope.options.userList = result;
            },function(data){
				baseService.tips('获取用户信息失败：'+data,'danger',$scope);
			});
        }

        init($scope);
    });
    angular.bootstrap(document,['userInfoApp']);
});
