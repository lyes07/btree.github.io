class Node {
    constructor(degree, leaf = true) {
        this.keys = new Array(2 * degree - 1).fill(null);
        this.children = new Array(2 * degree).fill(null);
        this.leaf = leaf;
        this.size = 0;
    }
}

class BTree {
    constructor(degree) {
        this.degree = degree;
        this.root = new Node(degree);
    }

    insert(key) {
        const root = this.root;
        if (root.size === 2 * this.degree - 1) {
            const newRoot = new Node(this.degree, false);
            newRoot.children[0] = root;
            this.splitChild(newRoot, 0);
            this.root = newRoot;
            this.insertNonFull(newRoot, key);
        } else {
            this.insertNonFull(root, key);
        }
    }

    insertNonFull(node, key) {
        let index = node.size - 1;
        if (node.leaf) {
            while (index >= 0 && key < node.keys[index]) {
                node.keys[index + 1] = node.keys[index];
                index--;
            }
            node.keys[index + 1] = key;
            node.size++;
        } else {
            while (index >= 0 && key < node.keys[index]) {
                index--;
            }
            index++;

            if (node.children[index].size === 2 * this.degree - 1) {
                this.splitChild(node, index);
                if (key > node.keys[index]) {
                    index++;
                }
            }

            this.insertNonFull(node.children[index], key);
        }
    }

    splitChild(parent, childIndex) {
        const child = parent.children[childIndex];
        const newChild = new Node(this.degree, child.leaf);
        newChild.size = this.degree - 1;

        parent.keys.splice(childIndex, 0, child.keys[this.degree - 1]);

        newChild.keys = child.keys.splice(this.degree, this.degree - 1);

        if (!child.leaf) {
            newChild.children = child.children.splice(this.degree, this.degree);
        }

        child.size = this.degree - 1;
        parent.children.splice(childIndex + 1, 0, newChild);
        parent.size++;
    }

    delete(key) {
        if (!this.root) {
            return;
        }
        this.deleteKey(this.root, key);
        if (this.root.size === 0 && !this.root.leaf) {
            this.root = this.root.children[0];
        }
    }

    deleteKey(node, key) {
        let index = this.findKeyIndex(node, key);
        if (index < node.size && node.keys[index] === key) {
            if (node.leaf) {
                this.removeFromLeaf(node, index);
            } else {
                this.removeFromNonLeaf(node, index);
            }
        } else {
            if (node.leaf) {
                return; 
            }

            let lastChild = (index === node.size) ? true : false;
            let child = node.children[index];

            if (child.size < this.degree) {
                this.fillChild(node, index);
            }

            if (lastChild && index > node.size) {
                this.deleteKey(node.children[index - 1], key);
            } else {
                this.deleteKey(node.children[index], key);
            }
        }
    }

    removeFromLeaf(node, index) {
        node.keys.splice(index, 1);
        node.size--;
    }

    removeFromNonLeaf(node, index) {
        let key = node.keys[index];

        if (node.children[index].size >= this.degree) {
            let pred = this.getPredecessor(node.children[index]);
            node.keys[index] = pred;
            this.deleteKey(node.children[index], pred);
        }
        else if (node.children[index + 1].size >= this.degree) {
            let succ = this.getSuccessor(node.children[index + 1]);
            node.keys[index] = succ;
            this.deleteKey(node.children[index + 1], succ);
        }
        else {
            this.mergeNodes(node, index);
            this.deleteKey(node.children[index], key);
        }
    }

    fillChild(node, index) {
        let prevChildIndex = index - 1;
        let nextChildIndex = index + 1;
        if (nextChildIndex < node.size && node.children[nextChildIndex].size >= this.degree) {
            this.borrowFromNext(node, index);
        }
        else if (prevChildIndex >= 0 && node.children[prevChildIndex].size >= this.degree) {
            this.borrowFromPrev(node, index);
        }
        else if (nextChildIndex < node.size) {
            this.mergeNodes(node, index);
        }
        else if (prevChildIndex >= 0) {
            this.mergeNodes(node, prevChildIndex);
        }
    }

    borrowFromNext(node, index) {
        let child = node.children[index];
        let rightSibling = node.children[index + 1];
        child.keys[child.size] = node.keys[index];
        node.keys[index] = rightSibling.keys[0];
        if (!child.leaf) {
            child.children[child.size + 1] = rightSibling.children[0];
        }
        rightSibling.keys.shift();
        if (!rightSibling.leaf) {
            rightSibling.children.shift();
        }
        child.size++;
        rightSibling.size--;
    }

    borrowFromPrev(node, index) {
        let child = node.children[index];
        let leftSibling = node.children[index - 1];
        for (let i = child.size; i > 0; i--) {
            child.keys[i] = child.keys[i - 1];
        }
        child.keys[0] = node.keys[index - 1];
        node.keys[index - 1] = leftSibling.keys[leftSibling.size - 1];
        if (!child.leaf) {
            for (let i = child.size + 1; i > 0; i--) {
                child.children[i] = child.children[i - 1];
            }
            child.children[0] = leftSibling.children[leftSibling.size];
        }
        leftSibling.keys.pop();
        if (!leftSibling.leaf) {
            leftSibling.children.pop();
        }
        child.size++;
        leftSibling.size--;
    }

    mergeNodes(node, childIndex) {
        let child = node.children[childIndex];
        let nextChildIndex = childIndex + 1;
        let nextChild = node.children[nextChildIndex];
        child.keys[this.degree - 1] = node.keys[childIndex];
        for (let i = 0; i < nextChild.size; i++) {
            child.keys[i + this.degree] = nextChild.keys[i];
        }
        if (!child.leaf) {
            for (let i = 0; i <= nextChild.size; i++) {
                child.children[i + this.degree] = nextChild.children[i];
            }
        }
        node.keys.splice(childIndex, 1);
        node.children.splice(nextChildIndex, 1);
        node.size--;
        child.size = 2 * this.degree - 1;
    }

    getPredecessor(node) {
        while (!node.leaf) {
            node = node.children[node.size];
        }
        return node.keys[node.size - 1];
    }

    getSuccessor(node) {
        while (!node.leaf) {
            node = node.children[0];
        }
        return node.keys[0];
    }

    findKeyIndex(node, key) {
        let index = 0;
        while (index < node.size && key > node.keys[index]) {
            index++;
        }
        return index;
    }

    search(key) {
        return this.searchKey(this.root, key);
    }

    searchKey(node, key) {
        let index = 0;
        while (index < node.size && key > node.keys[index]) {
            index++;
        }

        if (index < node.size && key === node.keys[index]) {
            return true; 
        } else if (node.leaf) {
            return false; 
        } else {
            return this.searchKey(node.children[index], key); 
        }
    }
    
}


function bTreeToMatrix(bTree) {
    if (!bTree.root) {
        return [];
    }

    const matrix = [];
    const queue = [bTree.root];

    while (queue.length > 0) {
        const levelSize = queue.length;
        const levelKeys = [];

        for (let i = 0; i < levelSize; i++) {
            const currentNode = queue.shift();
            levelKeys.push(currentNode.keys.slice(0, currentNode.size));

            for (let j = 0; j <= currentNode.size; j++) {
                const child = currentNode.children[j];
                if (child) {
                    queue.push(child);
                }
            }
        }

        matrix.push(levelKeys.flat().map(key => parseInt(key, 10))); // Convert keys to integers
    }

    return matrix;
}

const bTree = new BTree(3); 

function matrixToHtmlTable(matrix) {
    if (!matrix || matrix.length === 0) {
        return '';
    }

    const tableRows = matrix.map(row => {
        const cells = row.map(cell => `<td>${cell}</td>`).join('');
        return `<tr>${cells}</tr>`;
    });

    const tableHtml = `<table border="1">${tableRows.join('')}</table>`;
    return tableHtml;
}

const table = document.getElementById("table");

function show(){
    table.innerHTML = matrixToHtmlTable(bTreeToMatrix(bTree))
}

const insertField = document.getElementById("insertF");
const insertButton = document.getElementById("insertB");

const deleteField = document.getElementById("deleteF");
const deleteButton = document.getElementById("deleteB");

const searchField = document.getElementById("searchF");
const searchButton = document.getElementById("searchB");

function getValue(input) {
    return input.value; 
}
function getValue(input) {
    return input.value; 
}

function clean(input){
    input.value = '';
}
  
insertButton.addEventListener("click", function() {
    let value = getValue(insertField);
    clean(insertField);
    bTree.insert(value);
    show()
});

deleteButton.addEventListener("click", function() {
    let value = getValue(deleteField);
    clean(deleteField);
    bTree.delete(value);
    show()
});

searchButton.addEventListener("click", function() {
    let value = getValue(searchField);
    clean(searchField);
    let exist = bTree.search(value);
    if (exist) {
        alert('Exist')
    }
    else{
        alert('Do Not Exist')
    }
});