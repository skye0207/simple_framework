// const jsdom = require("jsdom");
// const babel = require("@babel/core");

// const JSDOM = jsdom.JSDOM;
// const document = new JSDOM(``).window.document;

const createElement = (type, props, ...children) => {
  return {
    type,
    props,
    children
  };
}

const list = [
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
]

function Item1(props) {
  console.log("Item")
  return <li className="item" style={props.style} onClick={props.onClick}>{props.children}</li>;
}

function List(props) {
  console.log("List");
  return (
    <ul>
      {
        props.list.map((item, index) => {
          return <Item1 style={{ background: item.color }} onClick={() => alert(item.text)}>{item.text}</Item1>
        })
      }
    </ul>
  );
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

const setAttribute = (dom, key, value) => {
  if (typeof value == 'function' && key.startsWith('on')) {
    const eventType = key.slice(2).toLowerCase();
    dom.addEventListener(eventType, value);
  } else if (key == 'style' && typeof value == 'object') {
    Object.assign(dom.style, value);
  } else if (typeof value != 'object' && typeof value != 'function') {
    dom.setAttribute(key, value);
  }
}

const render = (vdom, parent = null) => {
  const mount = parent ? (el => parent.appendChild(el)) : (el => el);
  console.log("vdom", vdom);
  if (isComponentVdom(vdom)){
    console.log("isComponentVdom");
    const props = Object.assign({}, vdom.props, {
      children: vdom.children
    })
    const componentVdom = vdom.type(props);
    return render(componentVdom, parent);
  } else if (isTextVdom(vdom)) {
    console.log("isTextVdom");
    return mount(document.createTextNode(vdom));
  } else if(isElementVdom(vdom)) {
    console.log("isElementVdom", vdom.type);
    const dom = mount(document.createElement(vdom.type));
    for (const child of vdom.children) {
      console.log("const child of vdom.children", child);
      render(child, dom);
    }
    for (const prop in vdom.props) {
      setAttribute(dom, prop, vdom.props[prop]);
    }
    return dom;
  }
}

render(<List list={list}/>, document.getElementById('root'));
