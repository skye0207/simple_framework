
function createTextElement(text) {
  return {
      type: "TEXT_ELEMENT",
      props: {
          nodeValue: text,
          children: [],
      },
  }
}

function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map(child =>
          typeof child === "object"
          ? child
          : createTextElement(child)
      ),
  }
  };
}

// 当前处理到的fiber节点
let nextFiberReconcileWork = null;
// 根fiber节点
let wipRoot = null;

function render(element, container) {
  console.log("render\nelement", element, "\ncontainer", container);
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    }
  }
  nextFiberReconcileWork = wipRoot;
}

function reconcileChildren(wipFiber, elements) {
  // 将vdom转成child, sibling, 然后返回这样串联起来的fiber链表
  // 每一个vdom的elements, 如果index是0， 那就是child串联， 否则
  // 就是sibling串联，创建出来的节点都要用return指向父节点
  let index = 0;
  let prevSibling = null;

  while(index < elements.length) {
    const element = elements[index];
    let newFiber = {
      type: element.type,
      props: element.props,
      dom: null,
      return: wipFiber,
      effectTag: "PLACEMENT"
    }
    if (index === 0) {
      wipFiber.child = newFiber;
    } else {
      prevSibling.sibling = newFiber;
    }
    prevSibling = newFiber;
    index++;
  }
}

function createDom(fiber) {
  const dom = 
    fiber.type === "TEXT_ELEMENT" 
    ? document.createTextNode("")
    : document.createElement(fiber.type);
    for(const prop in fiber.props) {
      setAttribute(dom, prop, fiber.props[prop]);
    }
    return dom;
}

function reconcile(fiber) {
  console.log("reconcile\nfiber", fiber)
  if(!fiber.dom) {
    fiber.dom = createDom(fiber)
  }
  reconcileChildren(fiber, fiber.props.children);
}

// reconcile的过程
function performNextWork(fiber) {
  console.log("performNextWork\nfiber", fiber);
  reconcile(fiber);
  if(fiber.child) {
    return fiber.child;
  }
  let nextFiber = fiber;
  while(nextFiber) {
    if(nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.return;
  }
}

function commitWork(fiber) {
  console.log("commitWork\nfiber", fiber);
  if(!fiber) {
    return; 
  }
  let domParentFiber = fiber.return;
  while(!domParentFiber.dom) {
    domParentFiber = domParentFiber.return;
  }
  const domParent = domParentFiber.dom;

  if(fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
    domParent.appendChild(fiber.dom);
  }
  commitWork(fiber.child)
  commitWork(fiber.sibling)
}

function commitRoot() {
  console.log("commitRoot");
  commitWork(wipRoot.child);
  wipRoot = null;
}

// ----schdule ----
// 空闲调度，不断地循环，将vdom转fiber
function workLoop(deadline) {
  console.log("workLoop\ndeadline", deadline.timeRemaining());
  let shouldYield = false;
  while(nextFiberReconcileWork && !shouldYield) {
    nextFiberReconcileWork = performNextWork(
      nextFiberReconcileWork
    );
    shouldYield = deadline.timeRemaining() < 1;
  }

  if(!nextFiberReconcileWork) {
    commitRoot();
  }

  requestIdleCallback(workLoop);
}

requestIdleCallback(workLoop);

function Item(props) {
  return (
    <li 
      className="item" 
      style={props.style} 
      onClick={props.onClick}>
      {props.children}
      <a href="#" onClick={props.onRemoveItem}>X</a>
    </li>
  )
}

class Component {
  constructor(props) {
    this.props = props || {};
    this.state = null;
  }

  shouldComponentUpdate(nextProps, nextState) {
    return nextProps != this.props || nextState != this.state;
  }

  setState(nextState) {
    this.state = Object.assign(this.state, nextState);
    if(this.dom && this.shouldComponentUpdate(this.props, nextState)) {
      patch(this.dom, this.render());
    }
  }

  componentWillMount() {}
  componentDidMount() {}
  componentWillReceiveProps() {}
  componentWillUnmount() {}
}

function patch(dom, vdom, parent = dom.parentNode) {
  
  const replace = parent ? el => {
    parent.replaceChild(el, dom);
    return el;
  } : (el => el);

  if (isComponentVdom(vdom)) {
    const props = Object.assign({}, vdom.props, {children: vdom.children});
    if (dom.__instance && dom.__instance.constructor == vdom.type) {
      // 同一个组件
      dom.__instance.componentWillReceiveProps(props);
      dom.__instance.props = props;
      return patch(dom, dom.__instance.render(), parent);
    } else if (Component.isPrototypeOf(vdom.type)){
      // 不是同一个组件， 直接替换
      const componentDom = renderComponent(vdom, parent);
      if (parent) {
        parent.replaceChild(componnetDom, dom);
        return componentDom;
      } else {
        return componentDom;
      }
    } else if (!Component.isPrototypeOf(vdom.type)) {
      // 函数组件
      return patch(dom, vdom.type(props), parent)
    }
  } else if (dom instanceof Text) {
    if (typeof dom === 'object') {
      return replace(render(vdom, parent));
    } else {
      return dom.textContent != vdom ? replace(render(vdom, parent)) : dom;
    }
  } else if (dom.nodeName !== vdom.type.toUpperCase() && typeof vdom === 'object') {
    return replace(render(vdom, parent));
  } else if(dom.nodeName === vdom.type.toUpperCase() && typeof vdom === 'object') {
    const active = document.activeElement;

    const oldDoms = {};
    [].concat(...dom.childNodes).map((child, index) => {
      const key = child.__key || `__index__${index}`;
      oldDoms[key] = child;
    });
    [].concat(...vdom.children).map((child, index) => {
      const key = child.props && child.props.key || `__index__${index}`;
      oldDoms[key] ? patch(oldDoms[key], child) : render(child, dom);
      delete oldDoms[key];
    })
    for (const key in oldDoms) {
      const instance = oldDoms[key].__instance;
      if (instance) instance.componentWillUnmount();
      oldDoms[key].remove();
    }
    // 把旧的属性去掉，设置新的props
    for (const attr of dom.attributes) dom.removeAttribute(attr.name);
    for (const prop in vdom.props) setAttribute(dom, prop, vdom.props[prop]);

    active.focus();

    return dom;
  }
}

class List extends Component {
  constructor(props) {
    super();
    this.state = {
      list: [
        {
          text: 'aaa',
          color: 'blue'
        },
        {
          text: 'ccc',
          color: 'orange'
        },
        {
          text: 'ddd',
          color: 'red'
        }
      ],
      textColor: props.textColor
    }
  }

  handleItemRemove(index) {
    this.setState({
      list: this.state.list.filter((item, i) => i!== index)
    });
  }

  handleAdd() {
    this.setState({
      list: [
        ...this.state.list,
        {
          text: this.ref.value
        }
      ]
    })
  }

  render() {
    return (
      <div>
        <ul className="list">
          {
            this.state.list.map((item, index) => {
              return  (
                <Item 
                  style={{
                    background: item.color, 
                    color: this.state.textColor
                  }}
                  // onClick={() => alert(item.text)}
                  onRemoveItem={() => this.handleItemRemove(index)}>
                  {item.text}
                </Item>
              )
            })
          }
        </ul>
        <div>
          <input ref={(ele) => {this.ref = ele}} />
          <button onClick={this.handleAdd.bind(this)}>add</button>
        </div>
      </div>
    )
  }
}

function isEventListenerAttr(key, value) {
  return typeof value == 'function' && key.startsWith('on');
}

function isStyleAttr(key, value) {
  return key == 'style' && typeof value == 'object';
}

function isPlainAttr(key, value) {
  return typeof value != 'object' && typeof value !='function';
}

function isRefAttr(key, value) {
  return key === 'ref' && typeof value === 'function';
}

const setAttribute = (dom, key, value) => {
  if(key === 'children') {
    return;
  }

  if (key === 'nodeValue'){
    dom.textContent = value;
  } else if (isEventListenerAttr(key, value)) {
    const eventType = key.slice(2).toLowerCase();
    dom.__handlers = dom.__handlers || {};
    dom.removeEventListener(eventType, dom.__handlers[eventType]);
    dom.__handlers[eventType] = value;
    dom.addEventListener(eventType, value);
  } else if(key == 'checked' || key == 'value' || key == 'className'){
    dom[key] = value;
  } else if (isRefAttr(key, value)){
    value(dom);
  } else if(key == 'key') {
    dom.__key = value;
  } else if (isStyleAttr(key, value)) {
    Object.assign(dom.style, value);
  } else if (isPlainAttr(key, value)) {
    dom.setAttribute(key, value);
  }
}

function isComponentVdom(vdom) {
  return typeof vdom.type == 'function';
}

const isTextVdom = (vdom) => {
  return typeof vdom == 'string' || typeof vdom == 'number';
}

const isElementVdom = (vdom) => {
  return typeof vdom == 'object' && typeof vdom.type == 'string';
} 

function renderComponent(vdom, parent) {
  const props = Object.assign({}, vdom.props, {
    children: vdom.children
  })
  // const componentVdom = vdom.type(props);
  // return render(componentVdom, parent);

  if (Component.isPrototypeOf(vdom.type)) {
    // 类组件
    const instance = new vdom.type(props);

    instance.componentWillMount();

    const componentVdom = instance.render();
    instance.dom = render(componentVdom, parent);
    instance.dom.__instance = instance;
    instance.dom.__key = vdom.props.key;

    instance.componentDidMount();

    return instance.dom;
  } else {
    // 函数组件
    const componentVdom = vdom.type(props);
    return render(componentVdom, parent);
  }
}

// const render = (vdom, parent = null) => {
//   const mount = parent ? (el => parent.appendChild(el)) : (el => el);
//   if (isComponentVdom(vdom)){
//     renderComponent(vdom, parent);
//   } else if (isTextVdom(vdom)) {
//     return mount(document.createTextNode(vdom));
//   } else if(isElementVdom(vdom)) {
//     const dom = mount(document.createElement(vdom.type));
//     for (const child of [].concat(...vdom.children)) {
//       render(child, dom);
//     }
//     for (const prop in vdom.props) {
//       setAttribute(dom, prop, vdom.props[prop]);
//     }
//     return dom;
//   }
// }


const data = {
  item1: 'bb',
  item2: 'cc'
}

const jsx =  (<ul className="list">
  <li className="item" style={{ background: 'blue', color: 'pink' }} onClick={() => alert(2)}>aa</li>
  <li className="item">{data.item1}<i>xxx</i></li>
  <li className="item">{data.item2}</li>
</ul>);


// render(<List textColor={'#000'}/>, document.getElementById('root'));
render(jsx, document.getElementById('root'));
