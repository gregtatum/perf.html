// @flow
import React, { PureComponent } from 'react';
import { ContextMenu, MenuItem, SubMenu } from 'react-contextmenu';
import actions from '../actions';
import { connect } from 'react-redux';
import { selectedThreadSelectors } from '../reducers/profile-view';
import copy from 'copy-to-clipboard';

import type { IndexIntoFuncStackTable, FuncStackInfo } from '../../common/types/profile-derived';
import type { Thread, IndexIntoFuncTable } from '../../common/types/profile';

type Props = {
  thread: Thread,
  funcStackInfo: FuncStackInfo,
  selectedFuncStack: IndexIntoFuncStackTable,
}

class ProfileCallTreeContextMenu extends PureComponent {

  constructor(props: Props) {
    super(props);
    (this: any).copyFunctionName = this.copyFunctionName.bind(this);
    (this: any).copyStack = this.copyStack.bind(this);
    (this: any).chargeFuncToCaller = this.chargeFuncToCaller.bind(this);
    (this: any).pruneSubtree = this.pruneSubtree.bind(this);
  }

  getSelectedFuncIndex(): IndexIntoFuncTable {
    const {
      selectedFuncStack,
      funcStackInfo: { funcStackTable },
    } = this.props;

    return funcStackTable.func[selectedFuncStack];
  }

  copyFunctionName(): void {
    const {
      selectedFuncStack,
      thread: { stringTable, funcTable },
      funcStackInfo: { funcStackTable },
    } = this.props;

    const funcIndex = funcStackTable.func[selectedFuncStack];
    const stringIndex = funcTable.name[funcIndex];
    const name = stringTable.getString(stringIndex);
    copy(name);
  }

  copyStack(): void {
    const {
      selectedFuncStack,
      thread: { stringTable, funcTable },
      funcStackInfo: { funcStackTable },
    } = this.props;

    let stack = '';
    let funcStackIndex = selectedFuncStack;

    do {
      const funcIndex = funcStackTable.func[funcStackIndex];
      const stringIndex = funcTable.name[funcIndex];
      stack += stringTable.getString(stringIndex) + '\n';
      funcStackIndex = funcStackTable.prefix[funcStackIndex];
    } while (funcStackIndex !== -1);

    copy(stack);
  }

  chargeFuncToCaller(): void {
    this.props.chargeFuncToCaller(this.getSelectedFuncIndex());
  }

  pruneSubtree(): void {
    this.props.chargeFuncToCaller(this.getSelectedFuncIndex());
  }

  render() {
    return (
      <ContextMenu id={'ProfileCallTreeContextMenu'}>
        <SubMenu title='Copy' hoverDelay={200}>
          <MenuItem onClick={this.copyFunctionName}>Function Name</MenuItem>
          <MenuItem onClick={this.copyStack}>Stack</MenuItem>
        </SubMenu>
        <SubMenu title='Prune' hoverDelay={200}>
          <MenuItem onClick={this.chargeFuncToCaller}>This function</MenuItem>
          <MenuItem onClick={this.pruneSubtree}>This function and descendants</MenuItem>
        </SubMenu>
        <SubMenu title='Focus' hoverDelay={200}>
          <MenuItem>Calls made by this function</MenuItem>
        </SubMenu>
      </ContextMenu>
    );
  }
}

export default connect(state => ({
  thread: selectedThreadSelectors.getFilteredThread(state),
  funcStackInfo: selectedThreadSelectors.getFuncStackInfo(state),
  selectedFuncStack: selectedThreadSelectors.getSelectedFuncStack(state),
}), actions)(ProfileCallTreeContextMenu);
