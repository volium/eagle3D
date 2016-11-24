
if(!Detector.webgl) Detector.addGetWebGLMessage();

var camera, controls, scene, renderer;
var topTextureMesh, bottomTextureMesh;
var board_parts = [];
var current_editing_element = null;
var current_editing_package = null;
var board_thickness = 1.6;//mm
var current_soldermask_color = '85,121,70';//Green
var silk_cfg = 'place,names';
var pcbReflectionCube = null;
var elementAxisHelper;

var goldMaterial = new THREE.MeshPhongMaterial({
    ambient: 0x3a1646,
    diffuse: 0xc09a39,
    emissive: 0x000000,
    specular: 0xa08d5d,
    color: 0xffd700,
    shininess: 51.2,
    shading: THREE.FlatShading,
    side: THREE.DoubleSide
});

var boardMaterial = new THREE.MeshPhongMaterial({
    color: 0x927a4a,
    shininess: 10,
    shading: THREE.SmoothShading,
    side: THREE.DoubleSide
});

var stlMaterial = new THREE.MeshPhongMaterial({
    color: 0xbababa,
    shininess: 10,
    shading: THREE.SmoothShading
});

init();
render();

//function animate() {
//    requestAnimationFrame(animate);
//    controls.update();
//}

function init() {

    //camera

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 600);
    camera.up.set(0,0,1);

    //scene

    scene = new THREE.Scene();

    // lights

    light = new THREE.DirectionalLight(0xffffff);
    light.position.set( 100, 100, 90 );
    scene.add(light);

    light = new THREE.DirectionalLight(0xffffff);
    light.position.set( -200, -200, -190 );
    scene.add(light);

    light = new THREE.AmbientLight(0x222222);
    scene.add(light);

    // renderer

    if(Detector.webgl){
        renderer = new THREE.WebGLRenderer({antialias:false});
        renderer.sortObjects = false;
    } else {
        renderer = new THREE.CanvasRenderer();
    }

    renderer.setClearColor(0xcccccc, 1);
    renderer.setSize(window.innerWidth, window.innerHeight);

    document.getElementById('container').appendChild(renderer.domElement);

    //controls
    
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.noKeys = true;
    controls.addEventListener('change', render);

    //world
    
    var grid = new THREE.GridHelper(250, 10);
    grid.rotation.x = Math.PI/2;
    grid.position.z = board_thickness/2;
    scene.add(grid);

    var path = "/img/Bridge2/";
    var format = '.jpg';
    var urls = [
        path + 'px' + format, path + 'nx' + format,
        path + 'py' + format, path + 'ny' + format,
        path + 'pz' + format, path + 'nz' + format
    ];

    pcbReflectionCube = THREE.ImageUtils.loadTextureCube(urls);
    current_soldermask_color = UserConfig.getBoard(filename).soldermask_color;
    silk_cfg = UserConfig.getBoard(filename).silk_cfg;

    renderElements();
    createBoard();

    var axisHelper = new THREE.AxisHelper(10);
    axisHelper.position.x = -0;
    axisHelper.position.y = -0;
    scene.add(axisHelper);

    elementAxisHelper = new THREE.AxisHelper(200);

    //

    window.addEventListener('resize', onWindowResize, false);

    //animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

    render();
}

function render() {
    renderer.render(scene, camera);
}

function createBoard()
{
    var vectors = [];

    for(var index in board_data.vertices.outline)
    {
        if(index%2 !== 0)
        {
            vectors.push(new THREE.Vector3(board_data.vertices.outline[index-1], /*board_data.yMax-*/board_data.vertices.outline[index], 0));
        }

        if((index%4 === 0 && index > 0) || index == board_data.vertices.outline.length-1)
        {
            vectors.push(new THREE.Vector3(vectors[0].x+0.001, vectors[0].y+0.001, 0));

            var boardOutline = new THREE.Shape();
            boardOutline.fromPoints(vectors);

            var rectGeom = new THREE.ExtrudeGeometry(boardOutline, {
                amount: board_thickness,
                bevelEnabled: false
            });

            var board = new THREE.Mesh(rectGeom, boardMaterial);
            board_parts.push(board);
            scene.add(board);

            vectors = [];
        }
    }

    controls.target = new THREE.Vector3(board_data.xMax/2, board_data.yMax/2, 0);
    camera.position.set(board_data.xMax/2, -100, 100);
    controls.update();

    var topTexture = new THREE.ImageUtils.loadTexture("/board/get-texture?texture=top&soldermask_color="+current_soldermask_color+'&silk_cfg='+silk_cfg, {}, function() {

        var topMaterial = new THREE.MeshPhongMaterial({
            shininess: 10,
            ambient: 0xaaaaaa,
            specular: 0xcccccc,
            transparent: true,
            opacity: 1,
            envMap: pcbReflectionCube,
            reflectivity: 0.1,
            map: topTexture
        });

        var topTextureGeometry = new THREE.PlaneGeometry(board_data.width, board_data.height, 128, 128);

        for (var i = 0, l = topTextureGeometry.vertices.length; i < l; i++) {
            topTextureGeometry.vertices[i].z = 0.005*(Math.sin(topTextureGeometry.vertices[i].x*4)+Math.cos(topTextureGeometry.vertices[i].y*4));
        }

        topTextureGeometry.computeFaceNormals();
        topTextureGeometry.computeVertexNormals();

        topTextureMesh = new THREE.Mesh(topTextureGeometry, topMaterial);
        topTextureMesh.position.x = board_data.xMax - (board_data.width/2);
        topTextureMesh.position.y = board_data.yMax - (board_data.height/2);
        topTextureMesh.position.z = board_thickness+0.001;
        topTextureMesh.updateMatrix();
        board_parts.push(topTextureMesh);
        scene.add(topTextureMesh);

        render();

        $("#loader_cnt").hide();
    });

    var bottomTexture = new THREE.ImageUtils.loadTexture("/board/get-texture?texture=bottom&soldermask_color="+current_soldermask_color+'&silk_cfg='+silk_cfg, {}, function() {

        var bottomMaterial = new THREE.MeshPhongMaterial({
            shininess: 10,
            ambient: 0xaaaaaa,
            specular: 0xcccccc,
            transparent: true,
            opacity: 1,
            map: bottomTexture,
            envMap: pcbReflectionCube,
            reflectivity: 0.1,
            side: THREE.DoubleSide
        });

        var bottomTextureGeometry = new THREE.PlaneGeometry(board_data.width, board_data.height, 128, 128);

        for (var i = 0, l = bottomTextureGeometry.vertices.length; i < l; i++) {
            bottomTextureGeometry.vertices[i].z = 0.005*(Math.sin(bottomTextureGeometry.vertices[i].x*4)+Math.cos(bottomTextureGeometry.vertices[i].y*4));
        }

        bottomTextureGeometry.computeFaceNormals();
        bottomTextureGeometry.computeVertexNormals();

        bottomTextureMesh = new THREE.Mesh(bottomTextureGeometry, bottomMaterial);
        bottomTextureMesh.position.x = board_data.xMax - (board_data.width/2);
        bottomTextureMesh.position.y = board_data.yMax - (board_data.height/2);
        bottomTextureMesh.position.z = 0.001;
        bottomTextureMesh.updateMatrix();
        board_parts.push(bottomTextureMesh);
        scene.add(bottomTextureMesh);

        render();

        $("#loader_cnt").hide();
    });

    //Holes

    for(var index in holes)
    {
        var hole = holes[index];

        var holeGeom = new THREE.CylinderGeometry(parseFloat(hole.drill)/2, parseFloat(hole.drill)/2, board_thickness, 32, 0, true);

        holeMesh = new THREE.Mesh(holeGeom, goldMaterial);
        holeMesh.rotation.z = Math.PI;
        holeMesh.rotation.x = Math.PI/2;
        holeMesh.position.x = parseFloat(hole.x);
        holeMesh.position.y = parseFloat(hole.y);
        holeMesh.position.z = board_thickness/2;

        holeMesh.updateMatrix();
        board_parts.push(holeMesh);
        scene.add(holeMesh);
    }

    render();
}

function renderElements()
{
    for(var index in packages)
    {
        (function(index){

            var loader = null;

            if(packages[index].model_type == 'dae') {
                loader = new THREE.ColladaLoader();
            } else if(packages[index].model_type == 'stl') {
                loader = new THREE.STLLoader();
            } else if(packages[index].model_type == 'box') {

                var geometry = new THREE.BoxGeometry(packages[index].box_config.box_width, packages[index].box_config.box_depth, packages[index].box_config.box_height);
                var material = new THREE.MeshPhongMaterial({color: 0x363636});
                var cube = new THREE.Mesh(geometry, material);

                cube.position.z += (packages[index].box_config.box_height/2);

                var package_elements = packages[index].elements;

                for(var index2 in package_elements) {
                    var obj = addElement(index, index2, cube.clone());

                    if(package_elements[index2].mirror) {
                        obj.position.z -= (packages[index].box_config.box_height/2);
                    }
                }

                render();

                return;
            } else return;

            loader.load('/board/get-model?id='+packages[index].model_id, function (result) {

                $(".loading-message").html('Loading '+packages[index].package);

                var package_elements = packages[index].elements;

                var packageMesh = null;

                if(packages[index].model_type == 'stl') {
                    packageMesh = new THREE.Mesh(result, stlMaterial);
                } else if(packages[index].model_type == 'dae') {
                    packageMesh = result.scene;
                }

                if(packageMesh) {
                    for(var index2 in package_elements) {
                        addElement(index, index2, packageMesh.clone());
                    }
                }

                render();
            });
        })(index);
    }
}

function addElement(index, index2, obj)
{
    var element = packages[index].elements[index2];

    obj.position.x = parseFloat(packages[index].offset_x);
    obj.position.y = parseFloat(packages[index].offset_y);

    if(element.rot) {
        obj.rotation.z = (parseInt(element.rot)+parseInt(packages[index].rot))*0.0174532925;
    }

    if(element.mirror) {
        obj.rotation.x = 180*0.0174532925;
        obj.position.z = -board_thickness;
    }

    obj.position.x += parseFloat(element.x) + parseFloat(element.offset_x);
    obj.position.y += parseFloat(element.y) + parseFloat(element.offset_y);
    obj.position.z += board_thickness+element.offset_z;

    if(parseFloat(element.offset_rot_x) != 0) {
        obj.rotation.x += parseFloat(element.offset_rot_x);
    }
    
    if(parseFloat(element.offset_rot_y) != 0) {
        obj.rotation.y += parseFloat(element.offset_rot_y);
    }
    
    if(parseFloat(element.offset_rot_z) != 0) {
        obj.rotation.z += parseFloat(element.offset_rot_z);
    }
    
    obj.updateMatrix();

    scene.add(obj);

    packages[index].elements[index2].obj = obj;
    packages[index].elements[index2].obj.visible = !element.hide;

    return obj;
}

$(document).ready(function(){
    $('#object_editor').hide();

    $("option[value='"+current_soldermask_color+"']").attr("selected", "selected");
    
    var cfg_values = silk_cfg.split(",");
    
    for(var i in cfg_values) {
        if(cfg_values[i] == 'place') {
            $('.silk_config_cfg input[value="place"]').attr("checked", "checked");
            $('.silk_config_cfg input[value="place"]').parent().addClass('active');
        }
        if(cfg_values[i] == 'names') {
            $('.silk_config_cfg input[value="names"]').attr("checked", "checked");
            $('.silk_config_cfg input[value="names"]').parent().addClass('active');
        }
        if(cfg_values[i] == 'values') {
            $('.silk_config_cfg input[value="values"]').attr("checked", "checked");
            $('.silk_config_cfg input[value="values"]').parent().addClass('active');
        } 
    }

    $('#show_elements').change(function(){
        for(var index in packages) {
            for(var index2 in packages[index].elements) {
                var element = packages[index].elements[index2];

                if(element.obj) {
                    if($(this).is(":checked")) {
                        element.obj.visible = true;
                    } else {
                        element.obj.visible = false;
                    }
                }
            }
        }

        render();
    });

    $('#show_board').change(function(){
        for(var index in board_parts) {
            if($(this).is(":checked")) {
                board_parts[index].visible = true;
            } else {
                board_parts[index].visible = false;
            }
        }

        render();
    });

    $('.object-link').click(function(e){
        e.preventDefault();
        var element_id = $(this).data('element-id');

        for(var index in packages) {
            for(var index2 in packages[index].elements)
            {
                if(packages[index].elements[index2].id == element_id) {
                    current_editing_element = packages[index].elements[index2];
                    populateEditor(packages[index], $(this));

                    if(current_editing_element.obj) {
                        current_editing_element.obj.add(elementAxisHelper);
                        render();
                    }

                    current_editing_package = packages[index];

                    if(current_editing_element.hide)
                        $('#hide_package_elements').attr('checked',true);
                    else
                        $('#hide_package_elements').attr('checked',false);

                    break;
                }
            }
        }

        return false;
    });

    $('.close-object-editor').click(function(e){
        e.preventDefault();

        if(current_editing_element.obj) {
            current_editing_element.obj.remove(elementAxisHelper);
            render();
        }
        
        $(this).parent().slideUp();

        return false;
    });

    $('.move-left').click(function(e){
        e.preventDefault();

        var move_delta = parseFloat($('input[name="move_delta"]:checked').val());

        current_editing_element.obj.position.x -= move_delta;

        current_editing_element.offset_x -= move_delta;
        UserConfig.setElementConfig(filename, current_editing_element);

        render();

        return false;
    });

    $('.move-right').click(function(e){
        e.preventDefault();

        var move_delta = parseFloat($('input[name="move_delta"]:checked').val());

        current_editing_element.obj.position.x += move_delta;

        current_editing_element.offset_x += move_delta;
        UserConfig.setElementConfig(filename, current_editing_element);

        render();

        return false;
    });

    $('.move-up').click(function(e){
        e.preventDefault();

        var move_delta = parseFloat($('input[name="move_delta"]:checked').val());

        current_editing_element.obj.position.y += move_delta;

        current_editing_element.offset_y += move_delta;
        UserConfig.setElementConfig(filename, current_editing_element);

        render();

        return false;
    });

    $('.move-down').click(function(e){
        e.preventDefault();

        var move_delta = parseFloat($('input[name="move_delta"]:checked').val());

        current_editing_element.obj.position.y -= move_delta;

        current_editing_element.offset_y -= move_delta;
        UserConfig.setElementConfig(filename, current_editing_element);

        render();

        return false;
    });

    $('.move-down-z').click(function(e){
        e.preventDefault();

        var move_delta = parseFloat($('input[name="move_delta"]:checked').val());

        current_editing_element.obj.position.z -= move_delta;

        current_editing_element.offset_z -= move_delta;
        UserConfig.setElementConfig(filename, current_editing_element);

        render();

        return false;
    });

    $('.move-up-z').click(function(e){
        e.preventDefault();

        var move_delta = parseFloat($('input[name="move_delta"]:checked').val());

        current_editing_element.obj.position.z += move_delta;

        current_editing_element.offset_z += move_delta;
        UserConfig.setElementConfig(filename, current_editing_element);

        render();

        return false;
    });

    $('.rotate-cw').click(function(e){
        e.preventDefault();

        var rotation_delta = parseFloat($('input[name="rotation_delta"]:checked').val())*0.0174532925;
        
        var axis = $(this).data('axis');
        
        if(axis == 'x') {
            current_editing_element.obj.rotation.x -= rotation_delta;
            current_editing_element.offset_rot_x -= rotation_delta;
        } else if(axis == 'y') {
            current_editing_element.obj.rotation.y -= rotation_delta;
            current_editing_element.offset_rot_y -= rotation_delta;
        } else if(axis == 'z') {
            current_editing_element.obj.rotation.z -= rotation_delta;
            current_editing_element.offset_rot_z -= rotation_delta;
        }

        UserConfig.setElementConfig(filename, current_editing_element);

        render();

        return false;
    });

    $('.rotate-ccw').click(function(e){
        e.preventDefault();

        var rotation_delta = parseFloat($('input[name="rotation_delta"]:checked').val())*0.0174532925;

        var axis = $(this).data('axis');
        
        if(axis == 'x') {
            current_editing_element.obj.rotation.x += rotation_delta;
            current_editing_element.offset_rot_x += rotation_delta;
        } else if(axis == 'y') {
            current_editing_element.obj.rotation.y += rotation_delta;
            current_editing_element.offset_rot_y += rotation_delta;
        } else if(axis == 'z') {
            current_editing_element.obj.rotation.z += rotation_delta;
            current_editing_element.offset_rot_z += rotation_delta;
        }

        UserConfig.setElementConfig(filename, current_editing_element);

        render();

        return false;
    });

    $("#soldermask_color").change(function(e){
        current_soldermask_color = $(this).val();

        $(".loading-message").html('Loading');
        $("#loader_cnt").show();

        topTextureMesh.material.map = THREE.ImageUtils.loadTexture('/board/get-texture?texture=top&soldermask_color='+current_soldermask_color+'&silk_cfg='+silk_cfg, {}, function(){
            $("#loader_cnt").hide();
            render();
        });

        bottomTextureMesh.material.map = THREE.ImageUtils.loadTexture('/board/get-texture?texture=bottom&soldermask_color='+current_soldermask_color+'&silk_cfg='+silk_cfg, {}, function(){
            $("#loader_cnt").hide();
            render();
        });

        UserConfig.setSoldermaskColor(filename, current_soldermask_color);
    });

    $(".category-link").click(function(e){
        e.preventDefault();

        var cat_id = $(this).data('cat-id');

        $.get('/board/get-category-devices', {id:cat_id}, function(data){
            $('#category_devices').html(data);
        });

        return false;
    });

    $(document).on('click', '.select-change-model-link', function(e){
        e.preventDefault();

        var model_id = $(this).data('model-id');

        $.get('/board/get-model-preview', {id:model_id}, function(data){
            $('#model_preview').html(data);
        });

        return false;
    });

    $(document).on('click', '.replace-model-link', function(e){
        e.preventDefault();

        var loader = null;

        var model_id = $(this).data('model-id');
        var offset_x = parseFloat($(this).data('offset-x'));
        var offset_y = parseFloat($(this).data('offset-y'));
        var rotation = parseInt($(this).data('rotation'));
        var type = $(this).data('model-type');

        $('#deviceModal').modal('hide');

        if(type == 'dae') {
            loader = new THREE.ColladaLoader();
        } else if(type == 'stl') {
            loader = new THREE.STLLoader();
        }

        loader.load('/board/get-model?id='+model_id, function (result) {

            for(var index in current_editing_package.elements) {

                var element = current_editing_package.elements[index];

                scene.remove(element.obj);

                var elementDae = null;

                if(type == 'dae') {
                    elementDae = result.scene.clone();
                } else if(type == 'stl') {
                    elementDae = new THREE.Mesh(result, stlMaterial);
                }

                elementDae.position.x = parseFloat(element.x)+offset_x+element.offset_x;
                elementDae.position.y = parseFloat(element.y)+offset_y+element.offset_y;

                if(element.rot)
                {
                    elementDae.rotation.z = parseInt(element.rot)*0.0174532925;
                }

                if(parseFloat(element.offset_rot_z) != 0)
                {
                    elementDae.rotation.z += parseFloat(element.offset_rot_z);
                }

                if(rotation)
                {
                    elementDae.rotation.z += parseInt(rotation)*0.0174532925;
                }

                if(element.mirror)
                {
                    elementDae.rotation.x = 180*0.0174532925;
                    elementDae.position.z = 0;
                }
                else
                {
                    elementDae.position.z = board_thickness;
                }

                elementDae.updateMatrix();
                scene.add(elementDae);

                current_editing_package.elements[index].obj = elementDae;
            }

            current_editing_package.model_type = 'dae';
            current_editing_package.model_id = model_id;
            UserConfig.setPackageConfig(filename, current_editing_package);

            $("#object_editor").prev().attr('style', "");

            populateEditor(current_editing_package, $('#object_editor').prev());

            render();
        });

        return false;
    });

    $('#user_dae').change(function(e){

        if($(this)[0].files.length == 0) return;

        $(".loading-message").html('Saving file');
        $("#loader_cnt").show();

        var file = $(this)[0].files[0];

        $('#deviceModal').modal('hide');

        var form = new FormData();
        form.append("file", file);

        var xhr = new XMLHttpRequest();
        xhr.onload = function() {
            var response = e.target.response;

            if(!response) {
                location = '/board';
            } else {
                alert(response);
            }

            console.log("Upload complete.");
            location = '/board';
        };

        form.append('element_name', current_editing_package.package);
        form.append('library_name', current_editing_package.library);

        xhr.open("post", "/board/upload-file", true);
        xhr.send(form);
    });

    $('.add-box-link').click(function(e){
        e.preventDefault();

        $('#deviceModal').modal('hide');

        var box_width = parseFloat($('#box_width').val());
        var box_height = parseFloat($('#box_height').val());
        var box_depth = parseFloat($('#box_depth').val());

        if(!box_width) { alert('Invalid box width'); return false; }
        if(!box_height) { alert('Invalid box height'); return false; }
        if(!box_depth) { alert('Invalid box depth'); return false; }

        for(var index in current_editing_package.elements) {
            var element = current_editing_package.elements[index];

            if(element.obj) scene.remove(element.obj);

            var geometry = new THREE.BoxGeometry(box_width, box_depth, box_height);
            var material = new THREE.MeshPhongMaterial({color: 0x363636});
            var cube = new THREE.Mesh(geometry, material);

            cube.position.x = parseFloat(element.x);
            cube.position.y = parseFloat(element.y);

            if(element.mirror)
            {
                cube.rotation.x = 180*0.0174532925;
                cube.position.z -= (box_height/2);
            }
            else
            {
                cube.position.z = (box_height/2)+board_thickness;
            }

            if(element.rot)
            {
                cube.rotation.z = parseInt(element.rot)*0.0174532925;
            }

            if(parseFloat(element.offset_rot_x) != 0) {
                obj.rotation.x += parseFloat(element.offset_rot_x);
            }

            if(parseFloat(element.offset_rot_y) != 0) {
                obj.rotation.y += parseFloat(element.offset_rot_y);
            }

            if(parseFloat(element.offset_rot_z) != 0) {
                obj.rotation.z += parseFloat(element.offset_rot_z);
            }
            
            scene.add(cube);

            current_editing_package.elements[index].obj = cube;
        }

        current_editing_package.model_type = 'box';
        current_editing_package.box_config = {
            box_width: box_width,
            box_depth: box_depth,
            box_height: box_height
        };

        UserConfig.setPackageConfig(filename, current_editing_package);
        $("#object_editor").prev().attr('style', "");

        populateEditor(current_editing_package, $('#object_editor').prev());

        setTimeout(function(){
            populateEditor(current_editing_package, $('#object_editor').prev());
        },100);

        render();

        return false;
    });

    $('.export-link-tstl').click(function(e){
        e.preventDefault();

        var exporter = new THREE.STLExporter();
        var data = exporter.parse(scene);
        
        window.open('data:application/sla;charset=utf-8,' + escape(data));

        return false;
    });
    
    $('.export-link-bstl').click(function(e){
        e.preventDefault();

        var exporter = new THREE.STLBinaryExporter();
        var dataView = exporter.parse(scene);
        
        var decoder = new TextDecoder();
        var decodedString = decoder.decode(dataView);

        window.open('data:application/sla;charset=utf-8,' + escape(decodedString));

        return false;
    });

    $('.export-link-obj').click(function(e){
        e.preventDefault();

        var exporter = new THREE.OBJExporter();
        var data = exporter.parse(scene);
        
        window.open('data:text/plain;charset=utf-8,' + escape(data));

        return false;
    });
    
    $('.export-link-img').click(function(e){
        e.preventDefault();

        var img = new Image();
        img.src = renderer.domElement.toDataURL();
        
        window.open(img.src);

        return false;
    });

    $('#hide_package_elements').change(function(e){

        current_editing_element.obj.visible = !current_editing_element.obj.visible;
        current_editing_element.hide = !current_editing_element.obj.visible;

        UserConfig.setElementConfig(filename, current_editing_element);

        render();
    });

    document.addEventListener("dragover", function(event) {
        event.preventDefault();
    }, false);

    document.addEventListener("drop", function(event) {
        if(event.dataTransfer.files.length != 1) {
            event.preventDefault();
            return;
        }

        $(".loading-message").html('Loading');
        $("#loader_cnt").show();

        // cancel default actions
        event.preventDefault();

        var i = 0,
            files = event.dataTransfer.files,
            len = files.length;

        for (; i < len; i++) {
            var form = new FormData();
            form.append("brd", files[i]);

            UserConfig.addBoard(files[i].name);
            form.append('board_config', localStorage.getItem("user_cfg"));

            // send via XHR - look ma, no headers being set!
            var xhr = new XMLHttpRequest();
            xhr.onload = function() {
                console.log("Upload complete.");
                location = '/board';
            };

            xhr.open("post", "/board/prepare", true);
            xhr.send(form);

            break;
        }

    }, false);
    
    $('#configModal').on('show.bs.modal', function (event) {
        var button = $(event.relatedTarget);
        var modal = $(this);
        
        var config = UserConfig.getAllConfig();
        
        var boards_html = '';
        
        for(var i in config.boards) {
            boards_html += '<li><a href="#" class="view-board-config-link" data-board-name="'+config.boards[i].name+'">'+config.boards[i].name+'</a></li>';
        }
        
        $('#user_saved_boards').html(boards_html);
        $('#board_config_view').html("");
    });
    
    $(document).on('click', '.view-board-config-link', function(e){
        e.preventDefault();
        
        var config = UserConfig.getAllConfig();
        var board = null;
        
        for(var i in config.boards) {
            if(config.boards[i].name == $(this).data('board-name')) {
                board = config.boards[i];
                break;
            }
        }
        
        if(!board) return false;
        
        var html = '<a href="#" class="btn btn-default pull-right delete-board-config" data-board-name="'+board.name+'">Delete All Changes</a><br><br>'
        html += '<table class="table table-condensed table-bordered table-hover text-center">\
                        <thead>\
                            <tr>\
                                <th class="text-center">Name</th>\
                                <th class="text-center">Hidden</th>\
                                <th class="text-center">Applied Rotation</th>\
                                <th class="text-center">Applied Offset</th>\
                            </tr>\
                        </thead>\
                        <tbody>';
        
        for(var i in board.elements) {
            html += '<tr>';
            html += '<td>'+board.elements[i].name+'<small> - '+board.elements[i].package+' ('+board.elements[i].library+') </small></td>';
            
            if(board.elements[i].hidden) {
                html += '<td><span class="label label-danger">Yes</span></td>';
            } else {
                html += '<td><span class="label label-success">No</span></td>';
            }
            
            html += '<td class="text-left">X: '+Math.round(board.elements[i].offset_rot_x*180/Math.PI)+'°<br>';
            html += 'Y: '+Math.round(board.elements[i].offset_rot_y*180/Math.PI)+'°<br>';
            html += 'Z: '+Math.round(board.elements[i].offset_rot_z*180/Math.PI)+'°</td>';
            
            html += '<td class="text-left">X: '+Math.round(board.elements[i].offset_x*100)/100+'<br>';
            html += 'Y: '+Math.round(board.elements[i].offset_y*100)/100+'<br>';
            html += 'Z: '+Math.round(board.elements[i].offset_z*100)/100+'</td>';
            
            html += '</tr>';
        }
        
        html+= '</tbody></table>';
        
        $('#board_config_view').html(html);
        
        return false;
    });
    
    $(document).on('click', '.delete-board-config', function(e){
        e.preventDefault();
        
        var board_name = $(this).data('board-name');
        
        UserConfig.deleteConfig(board_name, function(){
            location = '/board';
        });
        
        return false;
    });
    
    $('.silk_config_cfg input').change(function(e){
        silk_cfg = '';
        
        $('input[name="silk_config"]:checked').each(function(){
            silk_cfg += $(this).val()+',';
        });
        
        $(".loading-message").html('Loading');
        $("#loader_cnt").show();

        topTextureMesh.material.map = THREE.ImageUtils.loadTexture('/board/get-texture?texture=top&soldermask_color='+current_soldermask_color+'&silk_cfg='+silk_cfg, {}, function(){
            $("#loader_cnt").hide();
            render();
        });

        bottomTextureMesh.material.map = THREE.ImageUtils.loadTexture('/board/get-texture?texture=bottom&soldermask_color='+current_soldermask_color+'&silk_cfg='+silk_cfg, {}, function(){
            $("#loader_cnt").hide();
            render();
        });
        
        UserConfig.setSilkCfg(filename, silk_cfg);
        
    });
});

function populateEditor(package, target)
{
    $('#object_editor').slideUp('fast', function(){

        if(target.is($('#object_editor').prev()))
        {
            var domelement = $('#object_editor').detach();
            $('#deviceModal').after(domelement);
            
            if(current_editing_element.obj) {
                current_editing_element.obj.remove(elementAxisHelper);
                render();
            }

            return;
        }

        var domelement = $('#object_editor').detach();
        target.after(domelement);

        $('#object_editor').slideDown();

        if(package.model_type != 'none')
        {
            $("#package_controls").show();
        }
        else
        {
            $("#package_controls").hide();
        }
    });
}
