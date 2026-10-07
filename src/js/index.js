define(function(require){
	require('./common/base').init();
	var md = angular.module('indexApp',['yxBase']);

	md.controller('indexController',function($scope,baseService,$window,$compile){
		
		function init(scope){
			scope.ctrl = {showLogout:false};
			initData();
			var ifm = document.getElementById("contantFrame");
			ifm.height = document.documentElement.clientHeight - 17;
		}
		
		function initData(){
			var url = "/api/menu/tree";
			var promise = baseService.http(url,null,'get');
			promise.then(function(data){
				$scope.menuList = Array.isArray(data) ? data : [];
			},function(data){
				baseService.tips('获取菜单失败：'+data,'danger',$scope);
			});
		}
		
		$scope.showContent = function(url){
			if(!url){
				baseService.tips('暂无该版块！','info',$scope);
				return;
			}
			baseService.clearCache();
			document.getElementById("contantFrame").src = baseService.systemConfig.webRoot+url;
		}

		$scope.logout = function(form){
			var url = "/api/logout";
			var promise = baseService.http(url,null,'get');
			promise.then(function(data){
				$scope.ctrl.showLogout = false;
				baseService.setCache('token',null);
				baseService.setCache('userInfo',null);
				window.top.location = baseService.systemConfig.webRoot + "/login.html";
			},function(data){
				baseService.tips(data,'danger',$scope);
			});
		}

		init($scope);
	});

	angular.bootstrap(document,['indexApp']);
});
