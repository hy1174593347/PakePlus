define(function(require){
	require('common/base').init();
	var md = angular.module('menuApp',['yxBase']);
	md.controller('menuController',function($scope,baseService){
		
		function init(scope){
			scope.dim = {};
			scope.ctrl = {};
			scope.options = {};

			initRoleData();
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
		
		$scope.saveMenu = function(form){
			if(!baseService.validForm(form)){
				return;
			}
			
			if($scope.dim.parentMenuName !== 'ROOT' && !$scope.dim.menuLink){
				baseService.tips('请输入制子菜单路径','danger',$scope);
				return;
			}

			var roles = _.filter($scope.options.roles,function(item){
				return $scope.dim.role.includes(item.roleCode);
			});

			$scope.dim.roles = roles;
			
			var url = "/api/menu/addMenu";
			var param = angular.copy($scope.dim);
			var promise = baseService.http(url,param);
			promise.then(function(data){
				baseService.tips('新增菜单成功','success',$scope);
			},function(data){
				baseService.tips('新增菜单失败：'+data,'danger',$scope);
			});
		}

		$scope.cleanData = function(){
			$scope.dim = {};
		}
		
		init($scope);
	});

	angular.bootstrap(document,['menuApp']);
});
