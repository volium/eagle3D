window.UserConfig = {
    init: function() {
        if(!localStorage.getItem("user_cfg")) {
            localStorage.setItem("user_cfg", JSON.stringify({
                boards: []
            }));
        }
    },
    hasBoard: function(name) {
        var user_cfg = UserConfig.__getFromLocalStorage();

        for(var i in user_cfg.boards) {
            if(user_cfg.boards[i].name == name) return true;
        }

        return false;
    },
    addBoard: function(name) {
        if(UserConfig.hasBoard(name)) return false;

        var user_cfg = UserConfig.__getFromLocalStorage();

        user_cfg.boards.push({
            name: name,
            soldermask_color: '85,121,70',
            silk_cfg: 'place,names',
            elements: {},
            packages: {}
        });

        UserConfig.__setToLocalStorage(user_cfg);
    },
    getBoard: function(name) {
        var user_cfg = UserConfig.__getFromLocalStorage();

        for(var i in user_cfg.boards) {
            if(user_cfg.boards[i].name == name) return user_cfg.boards[i];
        }

        return false;
    },
    setSoldermaskColor: function(board_name, soldermask_color) {
        var user_cfg = UserConfig.__getFromLocalStorage();

        for(var i in user_cfg.boards) {
            if(user_cfg.boards[i].name == board_name) {
                user_cfg.boards[i].soldermask_color = soldermask_color;
            }
        }

        UserConfig.__setToLocalStorage(user_cfg);
        UserConfig.__sendToServer();
    },
    setSilkCfg: function(board_name, silk_cfg) {
        var user_cfg = UserConfig.__getFromLocalStorage();

        for(var i in user_cfg.boards) {
            if(user_cfg.boards[i].name == board_name) {
                user_cfg.boards[i].silk_cfg = silk_cfg;
            }
        }

        UserConfig.__setToLocalStorage(user_cfg);
        UserConfig.__sendToServer();
    },
    setPackageConfig: function(board_name, package) {
        var user_cfg = UserConfig.__getFromLocalStorage();

        var packageToSave = jQuery.extend(true, {}, package);

        packageToSave.elements = undefined;

        for(var i in user_cfg.boards) {
            if(user_cfg.boards[i].name == board_name) {
                user_cfg.boards[i].packages[package.id] = packageToSave;
            }
        }

        UserConfig.__setToLocalStorage(user_cfg);
        UserConfig.__sendToServer();
    },
    setElementConfig: function(board_name, element) {
        var user_cfg = UserConfig.__getFromLocalStorage();

        var elmentToSave = jQuery.extend(true, {}, element);

        elmentToSave.obj = null;

        for(var i in user_cfg.boards) {
            if(user_cfg.boards[i].name == board_name) {
                user_cfg.boards[i].elements[element.id] = elmentToSave;
            }
        }

        UserConfig.__setToLocalStorage(user_cfg);
        UserConfig.__sendToServer();
    },
    deleteConfig: function(board_name, callback) {
        var user_cfg = UserConfig.__getFromLocalStorage();

        for(var i in user_cfg.boards) {
            if(user_cfg.boards[i].name == board_name) {
                user_cfg.boards[i].elements = {};
                user_cfg.boards[i].packages = {};
            }
        }

        UserConfig.__setToLocalStorage(user_cfg);
        UserConfig.__sendToServer(callback);
    },
    getAllConfig: function() {
        return UserConfig.__getFromLocalStorage();
    },
    __sendToServer: function(callback) {
        $.post('/board/save-user-cfg', { board_config:localStorage.getItem("user_cfg") }, callback);
    },
    __getFromLocalStorage: function() {
        return JSON.parse(localStorage.getItem("user_cfg"));
    },
    __setToLocalStorage: function(user_cfg) {
        localStorage.setItem("user_cfg", JSON.stringify(user_cfg));
    }
};