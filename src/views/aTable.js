var ATable = (function () {
    // Private constants
    var SORT_ARROW_WIDTH = 8;
    var DEFAULT_ROWS_TO_RENDER = 100;
    var TOP_SCROLL_THRESHOLD = .1;
    var BOTTOM_SCROLL_THRESHOLD = .8;

    /**
     *
     * @type {ATable}
     */
    var ATable = Backbone.View.extend({
            initialize : function (options) {
                _.bindAll(this);
                this.reRenderTable = true;
                var err = validateTableArgs(options);
                if (err) {
                    console.error(err);
                    return;
                }

                this.availableColumnsArray = [];
                this.availableColumnsHash = {};
                this.columns = initColumns(this, options.columns);
                this.columns.bind("reset", this.render, this);
                this.columns.bind("sort", this.render, this);
                if (typeof options.sortColumn === "string") {
                    var i = this.columns.indexOf(options.sortColumn);
                    if (i >= 0) {
                        options.sortColumn = i;
                    }
                    else {
                        options.sortColumn = 0;
                    }
                }
                options.numColumns = this.columns.length;
                this.rows = new RowCollection([], options);
                this.rows.init = false;
                this.title = options.title;
                this.maxRows = options.maxRows || Number.MAX_VALUE;
                this.columnTarget = null;
                this.dataWorker = createDataWorker(options.fetchData, this.receivedData);
                this.height = options.height;
                this.rowsToRender = options.rowsToRender || DEFAULT_ROWS_TO_RENDER;
                this.prevScrollTop = 0;
                this.rowRange = {
                    first : 0,
                    last : this.rowsToRender
                };
                this.prevRowRange = {
                    first : 0,
                    last : this.rowsToRender
                };
            },

            events : {
                "click th" : "sortTable",
                "mousemove th" : "mouseMoveColumn",
                "mouseleave th" : "mouseLeaveColumn",
                "dragstart th" : "startDragColumn",
                "dragend" : "endDragColumn",
                "dragenter th" : "dragEnterColumn",
                "dragover th" : "dragOverColumn",
                "dragleave th" : "dragLeaveColumn",
                "drop th" : "dropColumn"
            },

            /**
             * Generates the ATable and adds it to the DOM
             * @param {function} callback function to call when the ATable is rendered
             * @return {ATable} a reference to this ATable
             */
            render : function (callback) {
                if (typeof callback === 'function') {
                    this.renderCallback = callback;
                }
                var params = {};
                if (!this.rows.init) {
                    this.rows.bind("reset", this.render, this);
                    this.rows.bind("sort", this.renderRows, this);
                    this.dataWorker.postMessage(null);
                    return this;
                }
                else if (this.reRenderTable) {
                    this.reRenderTable = false;
                    params.columns = this.columns.toJSON();
                    params.rows = getRowData(this.rows, this.maxRows);
                    params.title = this.title;
                    this.$el.html(this.generateTableHtml(params));
                    this.tableElt = this.$el.find("table");
                    this.parentElt = this.$el.find(".tableParent");
                    // Set up on-demand row rendering variables
                    this.tbodyElt = this.tableElt.find("tbody");
                    this.tbodyElt[0].scrollTop = this.prevScrollTop;
                    this.tbodyElt.scroll(this.scrollTable);
                    this.rowHeight = this.tbodyElt.find('tr:nth-child(2)').height();
                    this.visibleRows = parseInt(this.tbodyElt.height() / this.rowHeight);
                    var bufferRow = document.createElement("tr");
                    bufferRow.style.height = this.rowHeight * (this.rows.length - this.rowsToRender) + "px";
                    this.tbodyElt[0].appendChild(bufferRow);
                    var cols = this.tableElt.find("th");
                    for (var i = 0; i < cols.length; i++) {
                        this.columns.at(i).set('element', $(cols[i]));
                    }
                    this.sizeTable();
                    displaySortArrow(this.rows, this.tableElt);
                    if (typeof this.renderCallback === 'function') {
                        this.renderCallback();
                    }
                }
                else {
                    this.renderRows();
                }
                return this;
            },

            /**
             * Add/remove rows from the DOM, or replace data in the current rows
             */
            renderRows : function () {
                //if (this.rowRange.first < this.prevRowRange.first) {
                if(this.tbodyElt[0].scrollTop < this.prevScrollTop){
                    this.removeRows(this.prevRowRange.first - this.rowRange.first, false);
                    this.addRows(this.rowRange.first, this.prevRowRange.first, true);
                }
                //else if (this.rowRange.last > this.prevRowRange.last) {
                else if(this.tbodyElt[0].scrollTop > this.prevScrollTop){
                    this.removeRows(this.rowRange.last - this.prevRowRange.last, true);
                    this.addRows(this.prevRowRange.last, this.rowRange.last, false);
                }
                else {
                    this.refreshRows();
                }
                this.prevScrollTop = this.tbodyElt[0].scrollTop;
            },

            /**
             * Append or prepend table rows to the DOM
             * @param {number} start index in the row data collection of the first row to add
             * @param {number} end index in the row data collection of the last row to add
             * @param {boolean} prepend add rows to the beginning of the table instead of the end
             */
            addRows : function (start, end, prepend) {
                var firstRow = this.tbodyElt[0].firstChild;
                var lastRow = this.tbodyElt[0].lastChild;
                for (var i = start; i < end; i++) {
                    var tr = document.createElement("tr");
                    for (var j = 0; j < this.columns.length; j++) {
                        var div = document.createElement("div");
                        div.style.width = this.columns.at(j).get('element')[0].style.width;
                        var text = document.createTextNode(this.rows.getValue(i, j));
                        var td = document.createElement("td");
                        div.appendChild(text);
                        td.appendChild(div);
                        tr.appendChild(td);
                    }

                    if (prepend) {
                        this.tbodyElt[0].insertBefore(tr, firstRow.nextSibling); // TODO - need to fix the order of insertion
                    }
                    else {
                        this.tbodyElt[0].insertBefore(tr, lastRow);
                    }
                }
                var sizeChange = Math.abs(this.tbodyElt[0].scrollTop - this.prevScrollTop);
                if (prepend) {
                    //this.tbodyElt[0].scrollTop = this.tbodyElt[0].scrollHeight * TOP_SCROLL_THRESHOLD;
                    var bottomHeight = lastRow.style.height;
                    lastRow.style.height = Number(bottomHeight.substr(0, bottomHeight.length - 2)) + sizeChange + "px";
                    var topHeight = firstRow.style.height;
                    firstRow.style.height = Number(topHeight.substr(0, topHeight.length - 2)) - sizeChange + "px";
                }
                else {
                    //this.tbodyElt[0].scrollTop = (this.tbodyElt[0].scrollHeight - this.tbodyElt[0].clientHeight) * BOTTOM_SCROLL_THRESHOLD;
                    var bottomHeight = lastRow.style.height;
                    lastRow.style.height = Number(bottomHeight.substr(0, bottomHeight.length - 2)) - sizeChange + "px";
                    var topHeight = firstRow.style.height;
                    firstRow.style.height = Number(topHeight.substr(0, topHeight.length - 2)) + sizeChange + "px";
                }
            },

            /**
             * Remove table rows from the DOM
             * @param {number} num number of rows to remove
             * @param {boolean} removeFromBeginning remove the rows from the beginning of the table rather than the end
             */
            removeRows : function (num, removeFromBeginning) {
                var rows = this.tbodyElt[0].getElementsByTagName("tr");
                var start, end;
                if (removeFromBeginning) {
                    start = 1;
                    end = num + 1;
                }
                else {
                    start = rows.length - num + 1;
                    end = rows.length - 1;
                }
                for (var i = start; i < end; i++) {
                    rows = this.tbodyElt[0].getElementsByTagName("tr");
                    var tr = rows[start];       // As rows are removed from DOM, they are removed from this array
                    this.tbodyElt[0].removeChild(tr);
                }
            },

            /**
             * Refresh the data in the rendered table rows with what is currently in the row data collection
             */
            refreshRows : function () {
                var rows = this.tbodyElt[0].getElementsByTagName("tr");
                for (var i = 1; i <= rows.length; i++) {
                    var tr = rows[i];
                    var tdList = tr.getElementsByTagName("div");
                    for (var j = 0; j < tdList.length; j++) {
                        var div = tdList[j];
                        div.innerText = Util.formatEntityField(this.rows.getValue(this.rowRange.first + i - 1, j));
                    }
                }
            },

            /**
             * Track the rows that are visible in the table, and render/remove rows as the table is scrolled
             * @param {jQuery.Event} e jQuery scroll event
             */
            scrollTable : function (e) {
                var firstRow, lastRow;
                this.prevRowRange.first = this.rowRange.first;
                this.prevRowRange.last = this.rowRange.last;
                var bottomThreshold = (this.tbodyElt[0].scrollHeight - this.tbodyElt[0].clientHeight) * BOTTOM_SCROLL_THRESHOLD;
                var topThreshold = this.tbodyElt[0].scrollHeight * TOP_SCROLL_THRESHOLD;
                //if (e.target.scrollTop > bottomThreshold && e.target.scrollTop > this.prevScrollTop) {
                if (e.target.scrollTop > this.prevScrollTop) {
                    var rowsPast = parseInt((e.target.scrollTop - this.prevScrollTop) / this.rowHeight);//parseInt((e.target.scrollTop - bottomThreshold) / this.rowHeight);
                    firstRow = this.rowRange.first + rowsPast;
                    lastRow = this.rowRange.last + rowsPast;
                    
                }
                //else if (e.target.scrollTop < topThreshold && e.target.scrollTop < this.prevScrollTop) {
                else if (e.target.scrollTop < this.prevScrollTop) {
                    var rowsPast = parseInt((this.prevScrollTop - e.target.scrollTop) / this.rowHeight);//parseInt((topThreshold - e.target.scrollTop) / this.rowHeight);
                    firstRow = this.rowRange.first - rowsPast;
                    lastRow = this.rowRange.last - rowsPast;
                }
                else {
                    return;
                }
                if (firstRow > this.rows.length - this.rowsToRender) {
                    firstRow = this.rows.length - this.rowsToRender;
                }
                else if (firstRow < 0) {
                    firstRow = 0;
                }
                this.rowRange.first = firstRow;
                if (lastRow < this.rowsToRender) {
                    lastRow = this.rowsToRender;
                }
                this.rowRange.last = lastRow > this.rows.length ? this.rows.length : lastRow;
                this.renderRows();
            },

            /**
             * Perform work that has to be done after rendering the blotter table
             */
            doPostRender : function () {
                $("th").contextMenu({
                    menu : menu
                }, this.initColumnMenu);
                if (this.columns.length < 2) {
                    $("#columnMenu").disableContextMenuItems("#removeColumn");
                }
                else {
                    $("#columnMenu").enableContextMenuItems("#removeColumn");
                }
            },

            initColumnMenu : function (action, el, pos) {
                this.columnTarget = el.attr('id').split("_")[1];
                if (action === "addColumn") {
                    this.showAddColumnDialog(pos);
                }
                else if (action === "removeColumn") {
                    this.removeColumn(this.columnTarget);
                }
                else if (action === "renameColumn") {
                    this.showRenameColumnDialog(this.columnTarget, el.text(), pos);
                }
            },

            /**
             * Sort the row collection when a column header is clicked
             * @param {Event} e jQuery click event object
             */
            sortTable : function (e) {
                if (!this.mouseInResizePosition(e)) {
                    this.tableElt.find(".sortArrow").remove();
                    this.rows.setSortColumn(e.target.cellIndex);
                    displaySortArrow(this.rows, this.tableElt);
                    this.rows.sort();
                }
            },

            showAddColumnDialog : function (pos) {
                new EditColumnDialog({
                    editType : "add",
                    blotterType : this.blotterType,
                    callBack : this.addColumn,
                    columns : this.availableColumnsArray
                }).show(pos);
                return false; // Prevent default context menu from popping up
            },

            showRenameColumnDialog : function (col, colName, pos) {
                new EditColumnDialog({
                    editType : "rename",
                    blotterType : this.blotterType,
                    callBack : this.renameColumn
                }).show(pos, col, colName);
                return false; // Prevent default context menu from popping up
            },

            addColumn : function (col) {
                var column = this.columns.getByName(this.columnTarget);
                if (!this.columns.getByName(col) && this.availableColumnsHash[col]) {
                    // Increase the ordering of columns after insert
                    var rank = column.get("rank");
                    for (var i = rank; i < this.columns.length; i++) {
                        var val = this.columns.at(i);
                        val.set({
                            rank : val.get("rank") + 1
                        }, {
                            silent : true
                        });
                    }
                    var textWidth = Util.getTextWidth(col) + 15;
                    this.columns.add({
                        columnName : col,
                        entityField : col,
                        blotterName : this.blotterType,
                        rank : rank,
                        width : textWidth
                    });
                    this.columns.save(this.admin);
                }
            },

            removeColumn : function (name) {
                var col = this.columns.getByName(name);
                col.destroy();
                // Decrease the ordering of columns after delete
                for (var i = col.get('rank'); i < this.columns.length; i++) {
                    var val = this.columns.at(i);
                    val.set({
                        rank : val.get("rank") - 1
                    });
                }
                this.columns.save(this.admin);
            },

            renameColumn : function (newName, field) {
                this.columns.renameColumn(field, newName);
            },

            mouseMoveColumn : function (event) {
                if (this.mouseInResizePosition(event)) {
                    if ($(event.target).css("cursor") !== "e-resize") {
                        $(event.target).css("cursor", "e-resize");
                        $(event.target).css("opacity", 1);
                    }
                }
                else {
                    $(event.target).css("opacity", .8);
                    $(event.target).css("cursor", "pointer");
                }
            },

            mouseLeaveColumn : function (event) {
                $(event.target).css("opacity", 1);
            },

            mouseInResizePosition : function (event) {
                var mouseX = this.getMouseColumnOffset(event);
                var firstCol = !event.target.previousElementSibling;
                return (!firstCol && mouseX <= 5) || event.target.offsetWidth - mouseX <= 4;
            },

            getMouseColumnOffset : function (event) {
                var mouseX = event.offsetX;
                if (mouseX == null) {
                    mouseX = event.originalEvent.pageX - $(event.target).offset().left;
                }
                return mouseX;
            },

            /**
             * Explicitly set the width of the table based on the sum of the column widths
             */
            sizeTable : function () {
                var cols = this.$el.find("tbody>tr:first td");
                var newWidth = 1;
                for (var i = 0; i < cols.length; i++) {
                    newWidth += $(cols[i])[0].offsetWidth;
                }
                var minWidth = this.parentElt.width();
                if (newWidth < minWidth) newWidth = minWidth;
                this.tableElt.width(newWidth);
            },

            /**
             * Event handler for the start of a column drag (move or resize)
             * @param {Event} e jQuery dragstart event
             */
            startDragColumn : function (e) {
                var target = $(e.target);
                // User is resizing the column
                if (this.mouseInResizePosition(e)) {
                    if (this.getMouseColumnOffset(e) <= 4) {
                        target = $(e.target.previousSibling);
                    }
                    else {
                        target = $(e.target);
                    }
                    var posCol = target.offset();
                    var posTable = this.tableElt.parent().offset();
                    var height = this.tableElt.height() + 2;
                    var leftPad = target.css("padding-left");
                    var rightPad = target.css("padding-right");
                    var left, diff;
                    if (posCol.left < posTable.left) {
                        left = posTable.left;
                        diff = posTable.left - posCol.left;
                    }
                    else {
                        left = posCol.left;
                        diff = 0;
                    }
                    // subtract 5 from width because if the grayout div overlaps the cursor, dragend is immediately invoked
                    var width = target.width() - diff + Number(leftPad.substring(0, leftPad.length - 2))
                        + Number(rightPad.substring(0, rightPad.length - 2)) - 5;
                    var gray = $("#grayout");
                    gray.css("display", "block").css("left", left).css("top", posCol.top - 1).css("height", height + 1)
                        .css("width", width).attr('title', target[0].cellIndex);
                    // Firefox doesn't provide mouse coordinates in the 'drag' event, so we must use a document-level
                    // 'dragover' as a workaround
                    document.addEventListener('dragover', this.resizeGrayout);
                    // Disable the default drag image by replacing it with an empty div
                    e.originalEvent.dataTransfer.setDragImage(document.createElement("div"), 0, 0);
                }
                // User is moving the column
                else {
                    e.target.style.opacity = .35;
                }
                e.originalEvent.dataTransfer.setData("text", target[0].cellIndex);
            },

            /**
             * Grow or shrink the resize indicator as the mouse moves
             * @param {MouseEvent} e dragover event
             */
            resizeGrayout : function (e) {
                var gray = $("#grayout");
                var pos = gray.offset();
                var colIdx = this.rows.getColumnIndex(Number(e.dataTransfer.getData("text")));
                var col = this.columns.at(colIdx).get('element');
                var width = e.pageX - pos.left;
                var textWidth = Util.getTextWidth(col.text()) + SORT_ARROW_WIDTH;
                if (width >= textWidth) {
                    gray.css("width", width);
                }
                else {
                    gray.css("width", textWidth);
                }
            },

            /**
             * Resize a column when the resize operation ends or return the target column to its original style during a move operation
             * @param {Event} e jQuery dragend event
             */
            endDragColumn : function (e) {
                var gray = $("#grayout");
                if (gray.css("display") === "none") {
                    e.target.style.opacity = 1;
                }
                else {
                    document.removeEventListener('dragover', this.resizeGrayout, false);
                    var width = parseInt(e.originalEvent.clientX - gray.position().left - 10);
                    var grayWidth = gray.width();
                    var colIndex = Number(gray.attr('title'));
                    var col = this.columns.at(colIndex);
                    var posCol = col.get('element').offset();
                    var posTable = this.tableElt.parent().offset();
                    if (posCol.left < posTable.left) {
                        grayWidth += (posTable.left - posCol.left);
                    }
                    width = width < grayWidth ? grayWidth : width;
                    gray.css("display", "none");
                    col.set({width : width});
                    col.get('element').width(width);
                    this.tableElt.find('td:nth-child(' + (colIndex + 1) + ') div').width(width);
                    this.sizeTable();
                }
            },

            /**
             * Style the column header to indicate the dragged column may be moved there
             * @param {Event} e jQuery dragenter event
             */
            dragEnterColumn : function (e) {
                if ($("#grayout").css("display") === "none") {
                    e.target.classList.add("over");
                }
            },

            dragOverColumn : function (e) {
                if (e.preventDefault) {
                    e.preventDefault();
                }
            },

            /**
             * Return the column header style to normal when a column is no long being dragged over it
             * @param {Event} e jQuery dragleave event
             */
            dragLeaveColumn : function (e) {
                e.target.classList.remove("over");
            },

            /**
             * Initiate a move when a column is successfully dragged onto another column
             * @param {Event} e jQuery drop event
             */
            dropColumn : function (e) {
                if (e.preventDefault) {
                    e.preventDefault();
                }
                e.target.classList.remove("over");
                if ($("#grayout").css("display") === "none") {
                    var srcCol = Number(e.originalEvent.dataTransfer.getData("text"));
                    var destCol = e.target.cellIndex;
                    this.reRenderTable = true;
                    this.prevScrollTop = this.tbodyElt[0].scrollTop;
                    this.rows.moveColumn(srcCol, destCol);
                    this.columns.moveColumn(srcCol, destCol);
                }
            },

            saveMouseState : function (event) {
                if (event.which === 1) {
                    this.isMouseDown = true;
                }
                else {
                    this.isMouseDown = false;
                }
            },

            /**
             * Generate the actual table markup
             * @param {object} params Parameters needed to render the table
             * @return {String} HTML to render
             */
            generateTableHtml : function (params) {
                var headerRow = '<tr>';
                for (var i = 0; i < params.columns.length; i++) {
                    var widthStr = '';
                    if (params.columns[i].width) {
                        widthStr = 'style="width: ' + (params.columns[i].width + SORT_ARROW_WIDTH) + 'px;"';
                    }
                    headerRow += '<th draggable="true" ' + widthStr + '>' + params.columns[i].name + '</th>';
                }
                headerRow += '</tr>';
                var body = '';
                for (var i = this.rowRange.first; i < params.rows.length && i < this.rowRange.last; i++) {
                    body += '<tr>';
                    for (var j = 0; j < params.rows[i].row.length; j++) {
                        body += '<td><div style="width: ' + (params.columns[j].width + SORT_ARROW_WIDTH) + 'px;">' + params.rows[i].row[j] + '</div></td>';
                    }
                    body += '</tr>';
                }

                var html = '<div class="atableParent">' +
                    '<div class="atableTitleBar">' +
                    (params.title ? '<span class="atableTitle">' + params.title + '</span>' : '') +
                    '<input type="text" placeholder="search"></div>' +
                    '<div class="atableContainer">' +
                    '<table class="atable">' +
                    '<thead>' + headerRow + '</thead>' +
                    '<tbody style="height: ' + this.height + 'px;"><tr style="height: 0px;"></tr>' + body + '<tr style="height: 5000px;"></tr></tbody>' +
                    '</table></div>' +
                    '<div class="atableBottomBar"></div></div>' +
                    '<div id="grayout"></div>';
                return html;
            },

            /**
             * Update the row collection with new data from the data worker
             * @param {Array[]} data Row data returned by the data worker
             */
            receivedData : function (data) {
                // Skip data refresh if we're in the middle of a column resize or possibly moving the scrollbar
                /*  if (this.isMouseDown || $("#grayout").css("display") !== "none") {
                 return;
                 }*/
                this.scrollLeft = this.$el.find(".table").scrollLeft();
                this.scrollTop = this.$el.find(".table").scrollTop();
                if (!this.rows.init) {
                    this.rows.init = true;
                }
                this.rows.reset(data.map(function (row) {
                    return {row : row};
                }));
            },

            close : function () {
                this.remove();
                this.unbind();
            }
        })
        ;

    function validateTableArgs(options) {
        if (options.columns !== null && options.columns.length === 0) {
            return "Cannot specify empty 'columns' array";
        }
        if (!options.fetchData) {
            return "Missing fetchData arg: script tag id containing function to fetch the table data.";
        }
        return null;
    }

    /**
     * Instantiate a web worker using the function in the inline script tag
     * @param {string} dataFunctionTagId DOM id of the script tag containing the data function
     * @param {function} callback Callback function to call when the worker returns with data
     * @return {Worker} Web worker that fetches table data on a separate thread
     */
    function createDataWorker(dataFunctionTagId, callback) {
        var blob = new Blob([document.querySelector('#' + dataFunctionTagId).textContent, " self.onmessage=function(p){self.postMessage(fetchData(p));};"]);
        var url = window.URL || window.webkitURL;
        var worker = new Worker(url.createObjectURL(blob));
        worker.onmessage = function (e) {
            callback(e.data);
        }
        return worker;
    }

    /**
     * Initialize the collection of table columns
     * @param {ATable} table The Table which is being initialized
     * @param {Array} columns Array of objects representing table columns
     * @return {ColumnCollection} collection of the table's Column models
     */
    function initColumns(table, columns) {
        for (var i = 0; i < columns.length; i++) {
            if (typeof columns[i].width === "undefined") {
                columns[i].width = Util.getTextWidth(columns[i].name) + 10;
            }
            columns[i].order = i;
            table.availableColumnsArray.push(columns[i].name);
            table.availableColumnsHash[columns[i].name] = true;
        }
        return new ColumnCollection(columns);
    }

    /**
     * Return array of row arrays to be rendered by the table template
     * @param {RowCollection} rows Collection of Row models
     * @param {number} maxRows Max # of rows to render
     * @returns {Array} array of row value arrays
     */
    function getRowData(rows, maxRows) {
        var rowArr = [];
        for (var i = 0; i < rows.length && i < maxRows; i++) {
            rowArr.push({row : rows.getRow(i)});
        }
        return rowArr;
    }

    /**
     * Add an arrow indicating sort direction on the sort column header
     * @param {RowCollection} rows the table's row collection
     * @param {object} tableElt the table's jQuery object
     */
    function displaySortArrow(rows, tableElt) {
        if (typeof rows.sortColumn !== "undefined") {
            var arrow;
            if (rows.sortAscending) {
                arrow = "<div class='sortArrow'>&uarr;</div>";
            }
            else {
                arrow = "<div class='sortArrow'>&darr;</div>";
            }
            tableElt.find('th:nth-child(' + (rows.sortColumn + 1) + ')').append(arrow);
        }
    }

    return ATable;
})
    ();