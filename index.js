// const jsdom = require("jsdom");
// const babel = require("@babel/core");

// const JSDOM = jsdom.JSDOM;
// const document = new JSDOM(``).window.document;

const createElement = (type, props, children) => {
  return {
    type,
    props,
    children
  };
}

function Item(props) {
  return <li className="item" style={props.style} onClick={props.onClick}>{props.children}</li>;
}

class Component {
  constructor(props) {
    this.props = props || {};
    this.state = null;
  }

  setState(nextState) {
    this.state = nextState;
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

  componentWillMount() {
    console.log("componentWillMount");
  }

  componentDidMount() {
    console.log("componentDidMount");
  }

  render() {
    return (
      <ul className="list">
        {
          this.state.list.map((item, index) => {
            return  (
              <Item 
                style={{background: item.color, color: this.state.textColor}}
                onClick={() => alert(item.text)}>
                {item.text}
              </Item>
            )
          })
        }
      </ul>
    )
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
  console.log("render", vdom)
  const mount = parent ? (el => parent.appendChild(el)) : (el => el);
  if (isComponentVdom(vdom)){
    const props = Object.assign({}, vdom.props, {
      children: vdom.children
    })
    // const componentVdom = vdom.type(props);
    // return render(componentVdom, parent);

    if (Component.isPrototypeOf(vdom.type)) {
      const instance = new vdom.type(props);

      instance.componentWillMount();

      const componentVdom = instance.render();
      instance.dom = render(componentVdom, parent);

      instance.componentDidMount();

      return instance.dom;
    } else {
      const componentVdom = vdom.type(props);
      return render(componentVdom, parent);
    }

  } else if (isTextVdom(vdom)) {
    return mount(document.createTextNode(vdom));
  } else if(isElementVdom(vdom)) {
    const dom = mount(document.createElement(vdom.type));
    for (const child of vdom.children) {
      render(child, dom);
    }
    for (const prop in vdom.props) {
      setAttribute(dom, prop, vdom.props[prop]);
    }
    return dom;
  }
}

render(<List textColor={'pink'}/>, document.getElementById('root'));
