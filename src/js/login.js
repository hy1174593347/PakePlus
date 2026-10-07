define(function(require){
	require('./common/base').init();
	var md = angular.module('loginApp',['yxBase']);

	md.controller('loginController',function($scope,baseService){
		
		function init(scope){
			scope.ctrl = {};
			scope.dim = {};

			initGenerateKey();
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
		
		$scope.login = function(form){
			if(!baseService.validForm(form)){
				return;
			}

			if(!$scope.generateKey){
				baseService.tips('系统异常，请刷新页面重试','danger',$scope);
				return;
			}

			var param = angular.copy($scope.dim);
			param.loginPassword = baseService.encryptToBase64(param.loginPassword, $scope.generateKey);

			var url = "/login";
			var promise = baseService.httpNoModal(url,param);
			promise.then(function(data){
				baseService.setCache('token',data.token);
				baseService.setCache('userInfo',JSON.stringify(data.user));
				window.top.location = baseService.systemConfig.webRoot + "/index.html";
			},function(data){
				baseService.tips(data,'danger',$scope);
			});
		}

		init($scope);
	});

	angular.bootstrap(document,['loginApp']);
});
