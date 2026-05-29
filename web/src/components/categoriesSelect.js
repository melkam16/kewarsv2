import * as React from 'react';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import Chip from '@mui/material/Chip';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};


function getStyles(category, categories, theme) {
  return {
    fontWeight:
      categories.indexOf(category) === -1
        ? theme.typography.fontWeightRegular
        : theme.typography.fontWeightBold,
    backgroundColor:
        categories.indexOf(category) === -1
          ? '#FFFFFF'
          : '#FFC300',
  };
}

export default function CategorySelect({selectedCategories, allCategories, onChange, readOnly, name}) {
  const theme = useTheme();  

  const handleChange = ({ target }) => {
    const { value } = target;
    console.log(value);
    const change = typeof value === 'string' ? value.split(',') : value;
    onChange({ target: {name, value: change}});
  };

  return (
    <div>
      <FormControl fullWidth>
        <InputLabel id="categories-label">Categories</InputLabel>
        <Select
          readOnly={readOnly}
          labelId="categories-label"
          id="categories"
          multiple
          value={typeof selectedCategories === 'string' ? selectedCategories.split(',') : selectedCategories}
          error={!selectedCategories || !selectedCategories.length}
          onChange={handleChange}
          input={<OutlinedInput id="select-multiple-categories" label="Categories" />}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map((value) => (
                <Chip key={value} label={allCategories[value]?.label?.am || value} size="small" variant="outlined" color="error"/>
              ))}
            </Box>          
          )}          
          MenuProps={MenuProps}
        >
          {Object.keys(allCategories).map((category) => (
            <MenuItem
              key={category}
              value={category}
              style={getStyles(category, selectedCategories, theme)}
            >
              {allCategories[category]?.label?.am || category}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  );
}
