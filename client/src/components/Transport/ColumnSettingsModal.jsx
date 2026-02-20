import React, { useState, useEffect } from 'react';
import { Modal, Button, List, Typography } from 'antd';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MenuOutlined, HolderOutlined } from '@ant-design/icons';

const { Text } = Typography;

// Sortable Item Component
const SortableItem = ({ id, label }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginBottom: 8,
    padding: '12px 16px',
    backgroundColor: isDragging ? '#f0f9ff' : '#ffffff',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'move',
    zIndex: isDragging ? 999 : 'auto',
    position: 'relative',
    boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Text strong style={{ fontSize: '14px', color: '#333' }}>
        {label}
      </Text>
      <HolderOutlined style={{ color: '#999', fontSize: '16px' }} />
    </div>
  );
};

const ColumnSettingsModal = ({ open, onClose, columns, columnOrder, onSave }) => {
  const [items, setItems] = useState([]);

  // Initialize items based on columnOrder or default columns definition
  useEffect(() => {
    if (open && columns.length > 0) {
      let initialOrder = [];
      
      // If we have a saved order, map it to column objects
      if (columnOrder && columnOrder.length > 0) {
        // Create a map for quick access
        const colMap = new Map(columns.map(c => [c.id || c.accessorKey, c]));
        
        // Add ordered columns
        columnOrder.forEach(id => {
          if (colMap.has(id)) {
            initialOrder.push({ id, label: colMap.get(id).header });
            colMap.delete(id); // Remove so we don't duplicate
          }
        });
        
        // Add any remaining new columns at the end
        colMap.forEach((col, id) => {
             initialOrder.push({ id, label: col.header });
        });
      } else {
        // Default order from definition
        initialOrder = columns.map(c => ({ 
            id: c.id || c.accessorKey, 
            label: c.header 
        }));
      }
      
      setItems(initialOrder);
    }
  }, [open, columns, columnOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSave = () => {
    const newOrder = items.map(item => item.id);
    onSave(newOrder);
    onClose();
  };

  return (
    <Modal
      title={<Text strong style={{ fontSize: '16px' }}>Customize Columns</Text>}
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="save" type="primary" onClick={handleSave} style={{ backgroundColor: '#1E3A8A' }}>
          Apply Order
        </Button>,
      ]}
      bodyStyle={{ maxHeight: '60vh', maxWidth: '100%', overflowY: 'auto', padding: '16px 0' }}
      width={600}
    >
        <Text type="secondary" style={{ display: 'block', marginBottom: 16, padding: '0 16px' }}>
            Drag and drop items to reorder columns.
        </Text>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map(i => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div style={{ padding: '0 16px' }}>
            {items.map((item) => (
              <SortableItem key={item.id} id={item.id} label={item.label} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </Modal>
  );
};

export default ColumnSettingsModal;
